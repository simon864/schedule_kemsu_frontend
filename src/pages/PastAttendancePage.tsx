import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Check, X, Clock, AlertCircle, Save, 
  Loader, Calendar, Users, BookOpen
} from 'lucide-react';
import api from '../services/api';
import { AxiosError } from 'axios';

// Интерфейс для параметров маршрута
interface RouteParams extends Record<string, string | undefined> {
  lessonId: string;
}

// Интерфейс для статуса посещаемости из API
interface AttendanceStatus {
  value: string;
  label: string;
}

// Интерфейс для студента из API
interface ApiStudent {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  photo: string | null;
  subgroup: number;
}

// Интерфейс для записи посещаемости из API
interface ApiAttendance {
  id: number;
  lesson_id: number;
  student_id: number;
  status: string;
  comment?: string;
  student: ApiStudent;
  updatedAt: string;
  createdAt: string;
}

// Интерфейс для занятия из API
interface ApiLesson {
  id: number;
  group_id: number;
  subject_name: string;
  subgroup: number | null;
  date_time: string;
  academic_hours: number;
  group: {
    id: number;
    name: string;
  };
  attendances: ApiAttendance[];
  createdAt: string;
  updatedAt: string;
}

// Интерфейс для ответа от API
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// Интерфейс для студента в нашем формате
interface Student {
  id: number;
  first_name: string;
  last_name: string;
  middle_name: string;
  subgroup: number;
  attendance: {
    id: number;
    status: string;
    updatedAt?: string;
  };
}

// Интерфейс для занятия в нашем формате
interface LessonWithAttendance {
  id: number;
  group_id: number;
  group_name: string;
  subject_name: string;
  subgroup: number | 'all';
  date_time: string;
  academic_hours: number;
  students: Student[];
  createdAt: string;
  updatedAt: string;
}

// Интерфейс для ответа от API при сохранении посещаемости
interface UpdateAttendanceResponse {
  success: boolean;
  message?: string;
  data?: {
    id: number;
    status: string;
    updatedAt: string;
  };
}

// Интерфейс для ошибки API
interface ApiErrorResponse {
  message?: string;
  statusCode?: number;
  error?: string;
}

const PastAttendancePage: React.FC = () => {
  const navigate = useNavigate();
  const { lessonId } = useParams<RouteParams>();
  
  const [lesson, setLesson] = useState<LessonWithAttendance | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [statuses, setStatuses] = useState<AttendanceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [changedStudents, setChangedStudents] = useState<Set<number>>(new Set());

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    if (lessonId) {
      const id = parseInt(lessonId);
      if (!isNaN(id)) {
        fetchLessonData(id);
        fetchStatuses();
      } else {
        console.error('Некорректный ID занятия:', lessonId);
        setError('Некорректный ID занятия');
        setIsLoading(false);
      }
    } else {
      console.error('ID занятия не указан');
      setError('ID занятия не указан');
      setIsLoading(false);
    }
  }, [lessonId]);

  // Загрузка данных занятия
  const fetchLessonData = async (lessonId: number) => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`📚 Загрузка прошедшего занятия ${lessonId}...`);
      const response = await api.get<ApiResponse<ApiLesson>>(`/lessons/${lessonId}`);
      console.log('Ответ от /lessons/{id}:', response.data);

      if (response.data.success && response.data.data) {
        const apiLesson = response.data.data;
        
        // Преобразуем данные в нужный формат
        const transformedLesson: LessonWithAttendance = {
          id: apiLesson.id,
          group_id: apiLesson.group_id,
          group_name: apiLesson.group.name,
          subject_name: apiLesson.subject_name,
          subgroup: apiLesson.subgroup === null ? 'all' : apiLesson.subgroup,
          date_time: apiLesson.date_time,
          academic_hours: apiLesson.academic_hours,
          createdAt: apiLesson.createdAt,
          updatedAt: apiLesson.updatedAt,
          students: apiLesson.attendances.map(attendance => ({
            id: attendance.student.id,
            first_name: attendance.student.first_name,
            last_name: attendance.student.last_name,
            middle_name: attendance.student.middle_name || '',
            subgroup: attendance.student.subgroup,
            attendance: {
              id: attendance.id,
              status: attendance.status,
              updatedAt: attendance.updatedAt
            }
          }))
        };

        console.log('Преобразованные данные:', transformedLesson);
        setLesson(transformedLesson);
        setStudents(transformedLesson.students);
      } else {
        setError('Не удалось загрузить данные занятия');
      }
    } catch (error: unknown) {
      console.error('❌ Ошибка загрузки занятия:', error);
      
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        if (axiosError.response?.status === 404) {
          setError('Занятие не найдено');
        } else if (axiosError.response?.status === 401) {
          setError('Сессия истекла. Пожалуйста, войдите снова.');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setError(axiosError.response?.data?.message || 'Ошибка загрузки данных');
        }
      } else {
        setError('Произошла неизвестная ошибка');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка списка статусов
  const fetchStatuses = async () => {
    try {
      console.log('📚 Загрузка статусов посещаемости...');
      const response = await api.get('/attendance/statuses');
      console.log('Ответ от /attendance/statuses:', response.data);

      let statusesData: AttendanceStatus[] = [];

      if (response.data && typeof response.data === 'object') {
        if ('success' in response.data && response.data.success && Array.isArray(response.data.data)) {
          statusesData = response.data.data;
        } else if (Array.isArray(response.data)) {
          statusesData = response.data;
        } else if ('data' in response.data && Array.isArray(response.data.data)) {
          statusesData = response.data.data;
        }
      }

      if (statusesData.length > 0) {
        setStatuses(statusesData);
      } else {
        // Статусы по умолчанию, если API не вернул данные
        setStatuses([
          { value: 'present', label: 'Присутствует' },
          { value: 'absent', label: 'Отсутствует' },
          { value: 'late', label: 'Опоздал' },
          { value: 'excused', label: 'Уважительная' }
        ]);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки статусов:', error);
      // Используем статусы по умолчанию при ошибке
      setStatuses([
        { value: 'present', label: 'Присутствует' },
        { value: 'absent', label: 'Отсутствует' },
        { value: 'late', label: 'Опоздал' },
        { value: 'excused', label: 'Уважительная' }
      ]);
    }
  };

  // Обновление статуса студента
  const updateStudentStatus = (studentId: number, status: string) => {
    setStudents(prevStudents =>
      prevStudents.map(student => {
        if (student.id === studentId) {
          setChangedStudents(prev => new Set(prev).add(studentId));
          
          return {
            ...student,
            attendance: {
              ...student.attendance,
              status: status
            }
          };
        }
        return student;
      })
    );
  };

  // Сохранение изменений
  const handleSave = async () => {
    if (changedStudents.size === 0) {
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const savePromises = Array.from(changedStudents).map(async (studentId) => {
        const student = students.find(s => s.id === studentId);
        if (!student?.attendance?.id) return null;

        const attendanceData = {
          status: student.attendance.status
        };

        console.log(`📤 Отправка данных для студента ${studentId}:`, attendanceData);
        
        const response = await api.put<UpdateAttendanceResponse>(
          `/attendance/${student.attendance.id}`,
          attendanceData
        );

        return response.data;
      });

      const results = await Promise.all(savePromises);
      console.log('📥 Результаты сохранения:', results);

      const allSuccessful = results.filter(Boolean).every(r => r?.success);
      
      if (allSuccessful) {
        setChangedStudents(new Set());
        await fetchLessonData(parseInt(lessonId!));
      }
    } catch (error: unknown) {
      console.error('❌ Ошибка сохранения посещаемости:', error);
      
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        setError(axiosError.response?.data?.message || 'Ошибка при сохранении');
      } else {
        setError('Произошла ошибка при сохранении');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Получение цвета для статуса
  const getStatusColor = (status: string): string => {
    switch(status) {
      case 'present': return 'bg-green-100 text-green-700 border-green-200';
      case 'absent': return 'bg-red-100 text-red-700 border-red-200';
      case 'late': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'excused': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Получение иконки для статуса
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'present': return <Check className="w-4 h-4" />;
      case 'absent': return <X className="w-4 h-4" />;
      case 'late': return <Clock className="w-4 h-4" />;
      case 'excused': return <AlertCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  // Получение лейбла статуса
  const getStatusLabel = (statusValue: string): string => {
    const status = statuses.find(s => s.value === statusValue);
    return status?.label || statusValue;
  };

  // Форматирование имени студента
  const getStudentFullName = (student: Student): string => {
    return `${student.last_name} ${student.first_name} ${student.middle_name || ''}`.trim();
  };

  // Форматирование даты
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Группировка студентов по подгруппам
  const studentsBySubgroup = students.reduce((acc, student) => {
    const subgroup = student.subgroup || 0;
    if (!acc[subgroup]) {
      acc[subgroup] = [];
    }
    acc[subgroup].push(student);
    return acc;
  }, {} as Record<number, Student[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Ошибка</h2>
          <p className="text-gray-600 mb-6">{error || 'Занятие не найдено'}</p>
          <button
            onClick={() => navigate('/schedule')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Вернуться к расписанию
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/schedule')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-gray-800">{lesson.group_name}</h1>
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                    Прошедшее
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {new Date(lesson.date_time).toLocaleDateString('ru-RU', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })} в {new Date(lesson.date_time).toLocaleTimeString('ru-RU', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: false 
                  })}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving || changedStudents.size === 0}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Сохранить изменения
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Информация о занятии */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Предмет</p>
                <p className="font-medium text-gray-800">{lesson.subject_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Студентов</p>
                <p className="font-medium text-gray-800">{students.length} чел.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500">Длительность</p>
                <p className="font-medium text-gray-800">{lesson.academic_hours} ак. ч.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Отмечено студентов:</span>
            <span className="font-medium">
              {students.filter(s => s.attendance?.status).length} из {students.length}
              {changedStudents.size > 0 && (
                <span className="ml-2 text-xs text-blue-600">
                  ({changedStudents.size} изменено)
                </span>
              )}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 rounded-full h-2 transition-all"
              style={{ width: `${(students.filter(s => s.attendance?.status).length / students.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Students List */}
        <div className="space-y-6">
          {Object.entries(studentsBySubgroup).map(([subgroup, subgroupStudents]) => (
            <div key={subgroup} className="space-y-4">
              {subgroup !== '0' && (
                <h3 className="text-lg font-medium text-gray-700">
                  Подгруппа {subgroup}
                </h3>
              )}
              
              {subgroupStudents.map((student) => (
                <div
                  key={student.id}
                  className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                    changedStudents.has(student.id) 
                      ? 'border-blue-300 bg-blue-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800">
                          {getStudentFullName(student)}
                        </h3>
                        {student.attendance.updatedAt && (
                          <p className="text-xs text-gray-400 mt-1">
                            Обновлено: {formatDate(student.attendance.updatedAt)}
                          </p>
                        )}
                      </div>
                      
                      {student.attendance?.status && (
                        <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(student.attendance.status)} flex items-center gap-1`}>
                          {getStatusIcon(student.attendance.status)}
                          {getStatusLabel(student.attendance.status)}
                        </span>
                      )}
                    </div>

                    {/* Status Buttons */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {statuses.map((status) => (
                        <button
                          key={status.value}
                          onClick={() => updateStudentStatus(student.id, status.value)}
                          className={`flex-1 min-w-[80px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            student.attendance?.status === status.value
                              ? getStatusColor(status.value)
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PastAttendancePage;