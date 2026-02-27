import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Clock, ChevronRight, LogOut, 
  Plus, X, UserPlus, Trash2, Save,
  ArrowLeft, ArrowRight, BookOpen, Loader, Search
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { AxiosError } from 'axios';

// Интерфейс для занятия
interface Lesson {
  id: number;
  group_id: number;
  group_name: string;
  subject_name: string;
  subgroup: number | 'all';
  date_time: string;
  academic_hours: number;
  studentsCount?: number;
  status: 'upcoming' | 'completed';
}

// Интерфейс для группы из API
interface Group {
  id: number;
  name: string;
  students?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    middle_name: string;
    subgroup: number;
  }>;
  subgroups_count?: number;
  students_count?: number;
}

// Интерфейс для нового занятия
interface NewLesson {
  group_id: number;
  group_name: string;
  subject_name: string;
  subgroup: number | 'all';
  date_time: string;
  academic_hours: number;
}

// Интерфейс для студента при создании группы
interface NewStudent {
  id: string;
  first_name: string;
  last_name: string;
  middle_name: string;
  photo?: string;
  subgroup: number;
}

// Интерфейс для новой группы
interface NewGroup {
  name: string;
  students: NewStudent[];
}

// Интерфейс для ответа от API при создании занятия
interface CreateLessonResponse {
  success?: boolean;
  message?: string;
  id?: number;
  group_id?: number;
  group?: {
    id: number;
    name: string;
  };
  subject_name?: string;
  subgroup?: number;
  date_time?: string;
  academic_hours?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  attendances?: any[];
}

// Интерфейс для ответа от API при создании группы
interface CreateGroupResponse {
  success?: boolean;
  message?: string;
  id?: number;
  name?: string;
}

// Интерфейс для ошибки API
interface ApiErrorResponse {
  message?: string;
  statusCode?: number;
  error?: string;
}

const SchedulePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPastDate, setSelectedPastDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Состояние для занятий
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  
  // Состояние для групп
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Состояние для модального окна создания занятия
  const [showCreateLessonModal, setShowCreateLessonModal] = useState(false);
  const [isCreatingLesson, setIsCreatingLesson] = useState(false);
  const [newLesson, setNewLesson] = useState<NewLesson>({
    group_id: 0,
    group_name: '',
    subject_name: '',
    subgroup: 'all',
    date_time: new Date().toISOString(),
    academic_hours: 2
  });
  
  // Состояние для выбранной группы в модальном окне
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  
  // Состояние для модального окна создания группы
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroup, setNewGroup] = useState<NewGroup>({
    name: '',
    students: []
  });
  const [subgroupsCount, setSubgroupsCount] = useState<number>(1);
  const [currentStep, setCurrentStep] = useState<'group' | 'students'>('group');
  const [studentForm, setStudentForm] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    subgroup: 1
  });
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    // Проверяем наличие токена
    const token = localStorage.getItem('token');
    console.log('🔍 Токен при загрузке SchedulePage:', token ? 'присутствует' : 'отсутствует');
    
    if (!token) {
      console.warn('⚠️ Токен отсутствует, перенаправление на логин');
      navigate('/login');
      return;
    }
    
    // Загружаем данные
    fetchGroups();
    fetchLessons();
  }, []);

  // Функция загрузки групп с бэкенда
  const fetchGroups = async (): Promise<void> => {
    setIsLoadingGroups(true);
    try {
      console.log('📚 Загрузка групп...');
      
      const response = await api.get('/groups');
      console.log('Ответ от /groups:', response);
      
      // Обрабатываем ответ в зависимости от структуры
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let groupsData: any[] = [];
      
      if (response.data && typeof response.data === 'object') {
        if ('success' in response.data && response.data.success && Array.isArray(response.data.data)) {
          groupsData = response.data.data;
          console.log('Группы из response.data.data (success: true):', groupsData);
        } else if (Array.isArray(response.data)) {
          groupsData = response.data;
          console.log('Группы из response.data (прямой массив):', groupsData);
        } else if ('data' in response.data && Array.isArray(response.data.data)) {
          groupsData = response.data.data;
          console.log('Группы из response.data.data:', groupsData);
        } else {
          // Ищем любое поле, которое является массивом
          for (const key in response.data) {
            if (Object.prototype.hasOwnProperty.call(response.data, key) && Array.isArray(response.data[key])) {
              groupsData = response.data[key];
              console.log(`Найден массив в поле "${key}":`, groupsData);
              break;
            }
          }
        }
      }
      
      if (groupsData.length === 0) {
        console.warn('Не удалось найти массив групп в ответе:', response.data);
      }
      
      // Вычисляем количество подгрупп и студентов для каждой группы
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processedGroups: Group[] = groupsData.map((group: any) => {
        let subgroups_count = 0;
        let students_count = 0;
        
        if (group.students && Array.isArray(group.students)) {
          students_count = group.students.length;
          
          // Находим максимальный номер подгруппы
          const subgroups = new Set(
            group.students
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((s: any) => s.subgroup)
              .filter((s: number) => s > 0)
          );
          subgroups_count = subgroups.size;
        }
        
        return {
          id: group.id,
          name: group.name,
          students: group.students,
          subgroups_count,
          students_count
        };
      });
      
      console.log('Обработанные группы:', processedGroups);
      setGroups(processedGroups);
    } catch (error: unknown) {
      console.error('❌ Ошибка загрузки групп:', error);
      
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        console.error('Статус ошибки:', axiosError.response?.status);
        console.error('Данные ошибки:', axiosError.response?.data);
        
        if (axiosError.response?.status === 401) {
          console.log('Сессия истекла. Пожалуйста, войдите снова.');
          logout();
          navigate('/login');
        }
      }
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Функция загрузки занятий с бэкенда
  const fetchLessons = async (): Promise<void> => {
    setIsLoadingLessons(true);
    try {
      console.log('📚 Загрузка занятий...');
      
      const response = await api.get('/lessons');
      console.log('Ответ от /lessons:', response);
      
      // Обрабатываем ответ в зависимости от структуры
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let lessonsData: any[] = [];
      
      if (response.data && typeof response.data === 'object') {
        if ('success' in response.data && response.data.success && Array.isArray(response.data.data)) {
          lessonsData = response.data.data;
          console.log('Занятия из response.data.data (success: true):', lessonsData);
        } else if (Array.isArray(response.data)) {
          lessonsData = response.data;
          console.log('Занятия из response.data (прямой массив):', lessonsData);
        } else if ('data' in response.data && Array.isArray(response.data.data)) {
          lessonsData = response.data.data;
          console.log('Занятия из response.data.data:', lessonsData);
        } else {
          // Ищем любое поле, которое является массивом
          for (const key in response.data) {
            if (Object.prototype.hasOwnProperty.call(response.data, key) && Array.isArray(response.data[key])) {
              lessonsData = response.data[key];
              console.log(`Найден массив в поле "${key}":`, lessonsData);
              break;
            }
          }
        }
      }
      
      if (lessonsData.length === 0) {
        console.warn('Не удалось найти массив занятий в ответе:', response.data);
      }
      
      // Преобразуем данные в нужный формат с правильной типизацией
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const processedLessons: Lesson[] = lessonsData.map((lesson: any) => {
        // Определяем дату и время из date_time
        const dateTimeStr = lesson.date_time || lesson.date;
        const lessonDate = new Date(dateTimeStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let status: 'upcoming' | 'completed';
        if (lessonDate < today) {
          status = 'completed';
        } else {
          status = 'upcoming';
        }
        
        // Определяем подгруппу (0 означает все подгруппы)
        const subgroup = lesson.subgroup === 0 ? 'all' : lesson.subgroup;
        
        // Получаем название группы (может быть в разных форматах)
        let group_name = lesson.group_name || '';
        if (!group_name && lesson.group) {
          group_name = lesson.group.name || '';
        }
        
        return {
          id: lesson.id,
          group_id: lesson.group_id || 0,
          group_name: group_name,
          subject_name: lesson.subject_name || '',
          subgroup: subgroup,
          date_time: dateTimeStr,
          academic_hours: lesson.academic_hours || 2,
          status: status
        };
      });
      
      console.log('Обработанные занятия:', processedLessons);
      setLessons(processedLessons);
    } catch (error: unknown) {
      console.error('❌ Ошибка загрузки занятий:', error);
      
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        console.error('Статус ошибки:', axiosError.response?.status);
        console.error('Данные ошибки:', axiosError.response?.data);
        
        if (axiosError.response?.status === 401) {
          console.log('Сессия истекла. Пожалуйста, войдите снова.');
          logout();
          navigate('/login');
        }
      }
    } finally {
      setIsLoadingLessons(false);
    }
  };

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };


  // Фильтрация занятий по дате
  const filteredLessons = lessons.filter(l => {
    const lessonDate = new Date(l.date_time).toISOString().split('T')[0];
    return lessonDate === selectedDate && l.status === 'upcoming';
  });

  // Фильтрация прошедших занятий по выбранной дате
  const filteredPastLessons = lessons.filter(l => {
    const lessonDate = new Date(l.date_time).toISOString().split('T')[0];
    return lessonDate === selectedPastDate && l.status === 'completed';
  });

  // Функции для работы с созданием занятия
  const handleOpenCreateLesson = (): void => {
    // Создаем ISO строку с текущей датой и временем (09:00)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const defaultDateTime = `${year}-${month}-${day}T09:00:00.000Z`;
    
    setShowCreateLessonModal(true);
    setNewLesson({
      group_id: 0,
      group_name: '',
      subject_name: '',
      subgroup: 'all',
      date_time: defaultDateTime,
      academic_hours: 2
    });
    setSelectedGroup(null);
  };

  const handleCloseCreateLesson = (): void => {
    setShowCreateLessonModal(false);
    setIsCreatingLesson(false);
  };

  const handleGroupSelect = (groupId: number): void => {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      setSelectedGroup(group);
      setNewLesson({
        ...newLesson,
        group_id: group.id,
        group_name: group.name,
        subgroup: group.subgroups_count && group.subgroups_count > 0 ? 1 : 'all'
      });
    }
  };

  const handleCreateLesson = async (): Promise<void> => {
    // Валидация
    if (!newLesson.group_id) {
      console.log('Выберите группу');
      return;
    }
    if (!newLesson.subject_name.trim()) {
      console.log('Введите название предмета');
      return;
    }
    if (!newLesson.date_time) {
      console.log('Выберите дату и время');
      return;
    }
    if (newLesson.academic_hours < 1 || newLesson.academic_hours > 500) {
      console.log('Количество академических часов должно быть от 1 до 500');
      return;
    }

    setIsCreatingLesson(true);

    try {
      // Подготавливаем данные для отправки на бэкенд
      const lessonData = {
        group_id: newLesson.group_id,
        subject_name: newLesson.subject_name,
        date_time: newLesson.date_time,
        subgroup: newLesson.subgroup === 'all' ? 0 : newLesson.subgroup,
        academic_hours: newLesson.academic_hours
      };

      console.log('📤 Отправка данных занятия:', lessonData);
      
      const response = await api.post<CreateLessonResponse>('/lessons', lessonData);
      
      console.log('📥 Ответ от сервера:', response.data);
      
      // Проверяем успешность создания
      if (response.data.success) {
        await fetchLessons();
        console.log(`✅ Занятие по предмету "${newLesson.subject_name}" успешно создано`);
        handleCloseCreateLesson();
      } else if (response.data.id) {
        // Если сервер вернул созданное занятие напрямую (без success)
        await fetchLessons();
        console.log(`✅ Занятие по предмету "${newLesson.subject_name}" успешно создано`);
        handleCloseCreateLesson();
      } else {
        console.log(`❌ Ошибка: ${response.data.message || 'Неизвестная ошибка'}`);
      }
    } catch (error: unknown) {
      console.error('❌ Ошибка создания занятия:', error);
      
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        console.error('Статус ошибки:', axiosError.response?.status);
        console.error('Данные ошибки:', axiosError.response?.data);
        
        if (axiosError.response?.status === 401) {
          console.log('Сессия истекла. Пожалуйста, войдите снова.');
          logout();
          navigate('/login');
        } else if (axiosError.response?.status === 400) {
          console.log(`Ошибка валидации: ${axiosError.response.data?.message || 'Проверьте введенные данные'}`);
        } else if (axiosError.response?.status === 404) {
          console.log('Группа не найдена');
        } else {
          console.log(`Ошибка сервера: ${axiosError.response?.data?.message || 'Неизвестная ошибка'}`);
        }
      } else if (error instanceof Error) {
        console.log(`Ошибка: ${error.message}`);
      } else {
        console.log('Произошла неизвестная ошибка');
      }
    } finally {
      setIsCreatingLesson(false);
    }
  };

  // Функции для работы с созданием группы
  const handleOpenCreateGroup = (): void => {
    setShowCreateGroupModal(true);
    setCurrentStep('group');
    setNewGroup({ name: '', students: [] });
    setSubgroupsCount(1);
  };

  const handleCloseCreateGroup = (): void => {
    setShowCreateGroupModal(false);
    setCurrentStep('group');
    setNewGroup({ name: '', students: [] });
    setSubgroupsCount(1);
    setStudentForm({ first_name: '', last_name: '', middle_name: '', subgroup: 1 });
    setIsCreatingGroup(false);
  };

  const handleCreateGroup = (): void => {
    if (!newGroup.name.trim()) {
      console.log('Введите название группы');
      return;
    }
    setCurrentStep('students');
  };

  const handleAddStudent = (): void => {
    if (!studentForm.last_name.trim() || !studentForm.first_name.trim()) {
      console.log('Заполните имя и фамилию студента');
      return;
    }

    const newStudent: NewStudent = {
      id: Date.now().toString(),
      first_name: studentForm.first_name,
      last_name: studentForm.last_name,
      middle_name: studentForm.middle_name,
      subgroup: studentForm.subgroup,
      photo: ''
    };

    setNewGroup({
      ...newGroup,
      students: [...newGroup.students, newStudent]
    });

    setStudentForm({
      first_name: '',
      last_name: '',
      middle_name: '',
      subgroup: 1
    });
  };

  const handleRemoveStudent = (studentId: string): void => {
    setNewGroup({
      ...newGroup,
      students: newGroup.students.filter(s => s.id !== studentId)
    });
  };

  const handleSaveGroup = async (): Promise<void> => {
    if (newGroup.students.length === 0) {
      console.log('Добавьте хотя бы одного студента');
      return;
    }

    setIsCreatingGroup(true);

    try {
      // Подготавливаем данные для отправки на бэкенд
      const groupData = {
        name: newGroup.name,
        students: newGroup.students.map(s => ({
          first_name: s.first_name,
          last_name: s.last_name,
          middle_name: s.middle_name,
          photo: s.photo || '',
          subgroup: s.subgroup
        }))
      };

      console.log('📤 Отправка данных группы:', groupData);
      
      const response = await api.post<CreateGroupResponse>('/groups', groupData);
      
      console.log('📥 Ответ от сервера:', response.data);
      
      // Проверяем успешность создания
      if (response.data.success) {
        await fetchGroups();
        console.log(`✅ Группа ${newGroup.name} успешно создана с ${newGroup.students.length} студентами`);
        handleCloseCreateGroup();
      } else if (response.data.id) {
        await fetchGroups();
        console.log(`✅ Группа ${newGroup.name} успешно создана с ${newGroup.students.length} студентами`);
        handleCloseCreateGroup();
      } else {
        console.log(`❌ Ошибка: ${response.data.message || 'Неизвестная ошибка'}`);
      }
    } catch (error: unknown) {
      console.error('❌ Ошибка создания группы:', error);
      
      if (error instanceof AxiosError) {
        const axiosError = error as AxiosError<ApiErrorResponse>;
        console.error('Статус ошибки:', axiosError.response?.status);
        console.error('Данные ошибки:', axiosError.response?.data);
        
        if (axiosError.response?.status === 401) {
          console.log('Сессия истекла. Пожалуйста, войдите снова.');
          logout();
          navigate('/login');
        } else if (axiosError.response?.status === 409) {
          console.log('Группа с таким названием уже существует');
        } else {
          console.log(`Ошибка сервера: ${axiosError.response?.data?.message || 'Неизвестная ошибка'}`);
        }
      } else if (error instanceof Error) {
        console.log(`Ошибка: ${error.message}`);
      } else {
        console.log('Произошла неизвестная ошибка');
      }
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // Получение студентов по подгруппе
  const getStudentsBySubgroup = (subgroup: number): NewStudent[] => {
    return newGroup.students.filter(s => s.subgroup === subgroup);
  };

  // Форматирование имени пользователя
  const getFullName = (): string => {
    if (!user) return '';
    return `${user.last_name} ${user.first_name} ${user.middle_name || ''}`.trim();
  };

  // Получение инициалов пользователя
  const getUserInitials = (): string => {
    if (!user) return '?';
    const firstName = user.first_name?.[0] || '';
    const lastName = user.last_name?.[0] || '';
    return (firstName + lastName).toUpperCase() || '?';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <h1 className="text-xl font-semibold text-gray-800">Расписание</h1>
            </div>
            
            <div className="flex items-center gap-4">
              
              {/* Информация о пользователе (десктоп) */}
              {user && (
                <div className="hidden md:flex items-center gap-3 text-sm text-gray-600">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-xs">
                      {getUserInitials()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-800">
                      {user.last_name} {user.first_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {user.role === 'lecturer' ? 'Преподаватель' : user.role}
                    </span>
                  </div>
                </div>
              )}
              
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Выйти из системы"
              >
                <LogOut className="w-5 h-5" />
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>
          
          {/* Мобильная версия информации о пользователе */}
          {user && (
            <div className="md:hidden mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-medium text-xs">
                    {getUserInitials()}
                  </span>
                </div>
                <span className="font-medium text-gray-800">{getFullName()}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {user.role === 'lecturer' ? 'Преподаватель' : user.role}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Информация о преподавателе и кафедре */}
        {user && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 font-semibold text-xl">
                  {getUserInitials()}
                </span>
              </div>
              
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-800">{getFullName()}</h2>
                <p className="text-gray-500 mt-1">{user.login}</p>
              </div>
            </div>
          </div>
        )}

        {/* Календарь для текущих занятий */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Выберите дату для текущих занятий
          </label>
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {isLoadingLessons ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                Загрузка...
              </div>
            ) : (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredLessons.length} {filteredLessons.length === 1 ? 'занятие' : 
                  filteredLessons.length >= 2 && filteredLessons.length <= 4 ? 'занятия' : 'занятий'}
              </span>
            )}
          </div>
        </div>

        {/* Today's Lessons */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Текущие занятия на {new Date(selectedDate).toLocaleDateString('ru-RU')}
          </h2>
          
          {isLoadingLessons ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Loader className="w-12 h-12 text-gray-300 mx-auto mb-3 animate-spin" />
              <p className="text-gray-500">Загрузка занятий...</p>
            </div>
          ) : filteredLessons.length > 0 ? (
            <div className="grid gap-4">
              {filteredLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => navigate(`/attendance/${lesson.id}`)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer hover:border-blue-200"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-gray-800">
                          {lesson.group_name}
                        </h3>
                        {lesson.subgroup !== null ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            Подгруппа {lesson.subgroup}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            Все подгруппы
                          </span>
                        )}
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                          {lesson.academic_hours} ч.
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{lesson.subject_name}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(lesson.date_time).toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Нет текущих занятий на выбранную дату</p>
              <p className="text-sm text-gray-400 mt-2">
                Нажмите "Добавить новое занятие" чтобы создать занятие
              </p>
            </div>
          )}
        </div>

        {/* Кнопка добавления занятия */}
        <div className="mb-4">
          <button
            onClick={handleOpenCreateLesson}
            className="w-full py-4 border-2 border-dashed border-blue-300 rounded-xl text-blue-600 hover:border-blue-500 hover:text-blue-700 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Добавить новое занятие</span>
          </button>
        </div>

        {/* Кнопка добавления группы */}
        <div className="mb-8">
          <button
            onClick={handleOpenCreateGroup}
            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 group"
          >
            <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Добавить новую группу</span>
          </button>
        </div>

        {/* Календарь для прошедших занятий */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Search className="w-4 h-4 inline mr-1" />
            Выберите дату для поиска прошедших занятий
          </label>
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="date"
              value={selectedPastDate}
              onChange={(e) => setSelectedPastDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {isLoadingLessons ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader className="w-4 h-4 animate-spin" />
                Загрузка...
              </div>
            ) : (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredPastLessons.length} {filteredPastLessons.length === 1 ? 'занятие' : 
                  filteredPastLessons.length >= 2 && filteredPastLessons.length <= 4 ? 'занятия' : 'занятий'}
              </span>
            )}
          </div>
        </div>

        {/* Past Lessons */}
        {filteredPastLessons.length > 0 ? (
          <div>
            <h2 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-500" />
              Прошедшие занятия на {new Date(selectedPastDate).toLocaleDateString('ru-RU')}
            </h2>
            
            <div className="grid gap-4">
              {filteredPastLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  onClick={() => navigate(`/past-attendance/${lesson.id}`)}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer opacity-75 hover:opacity-100 hover:border-gray-300"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold text-gray-800">
                          {lesson.group_name}
                        </h3>
                        {lesson.subgroup !== 'all' ? (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            Подгруппа {lesson.subgroup}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            Все подгруппы
                          </span>
                        )}
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                          {lesson.academic_hours} ч.
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{lesson.subject_name}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(lesson.date_time).toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}</span>
                        </div>
                        {/* Удалено отображение количества студентов */}
                      </div>
                    </div>
                    
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Нет прошедших занятий на выбранную дату</p>
            <p className="text-sm text-gray-400 mt-2">
              Выберите другую дату для поиска
            </p>
          </div>
        )}
      </main>

      {/* Модальное окно создания занятия */}
      {showCreateLessonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">Создание нового занятия</h2>
                <button
                  onClick={handleCloseCreateLesson}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Выбор группы */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Группа <span className="text-red-500">*</span>
                  </label>
                  {isLoadingGroups ? (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader className="w-4 h-4 animate-spin" />
                      Загрузка групп...
                    </div>
                  ) : (
                    <select
                      value={newLesson.group_id}
                      onChange={(e) => handleGroupSelect(parseInt(e.target.value))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="0">Выберите группу</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.students_count || 0} студентов, {group.subgroups_count || 0} подгр.)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Выбор подгруппы (если есть) */}
                {selectedGroup && selectedGroup.subgroups_count && selectedGroup.subgroups_count > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Подгруппа
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <label className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="subgroup"
                          checked={newLesson.subgroup === 'all'}
                          onChange={() => setNewLesson({ ...newLesson, subgroup: 'all' })}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium">Все подгруппы</span>
                      </label>
                      
                      {[...Array(selectedGroup.subgroups_count)].map((_, i) => (
                        <label key={i + 1} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="subgroup"
                            checked={newLesson.subgroup === i + 1}
                            onChange={() => setNewLesson({ ...newLesson, subgroup: i + 1 })}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm font-medium">Подгруппа {i + 1}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Название предмета */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название предмета <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newLesson.subject_name}
                    onChange={(e) => setNewLesson({ ...newLesson, subject_name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Например: Программирование на Python"
                    autoFocus
                  />
                </div>

                {/* Дата и время */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дата и время занятия <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={newLesson.date_time ? new Date(newLesson.date_time).toLocaleString('sv-SE', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    }).replace(' ', 'T') : ''}
                    onChange={(e) => {
                      const localDateTime = e.target.value;
                      if (localDateTime) {
                        const [date, time] = localDateTime.split('T');
                        const [year, month, day] = date.split('-').map(Number);
                        const [hour, minute] = time.split(':').map(Number);
                        
                        const localDate = new Date(year, month - 1, day, hour, minute);
                        const isoString = localDate.toISOString();
                        
                        setNewLesson({ ...newLesson, date_time: isoString });
                      }
                    }}
                    min={new Date().toLocaleString('sv-SE', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    }).replace(' ', 'T')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Выберите дату и время начала занятия
                  </p>
                </div>

                {/* Академические часы */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество академических часов (1-500)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={newLesson.academic_hours}
                    onChange={(e) => setNewLesson({ 
                      ...newLesson, 
                      academic_hours: parseInt(e.target.value) || 1 
                    })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Общее количество академических часов на семестр
                  </p>
                </div>

                {/* Предпросмотр */}
                {newLesson.group_id !== 0 && newLesson.subject_name && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      Предпросмотр занятия
                    </h3>
                    <div className="text-sm text-blue-700">
                      <p><span className="font-medium">Группа:</span> {newLesson.group_name}</p>
                      <p><span className="font-medium">Подгруппа:</span> {
                        newLesson.subgroup === 'all' ? 'Все подгруппы' : `Подгруппа ${newLesson.subgroup}`
                      }</p>
                      <p><span className="font-medium">Предмет:</span> {newLesson.subject_name}</p>
                      <p><span className="font-medium">Дата и время:</span> {
                        newLesson.date_time ? 
                        new Date(newLesson.date_time).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        }) : 'Не указано'
                      }</p>
                      <p><span className="font-medium">Длительность:</span> {newLesson.academic_hours} ак. ч.</p>
                    </div>
                  </div>
                )}

                {/* Кнопки действий */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleCloseCreateLesson}
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    disabled={isCreatingLesson}
                  >
                    Отмена
                  </button>
                  <button
                    onClick={handleCreateLesson}
                    disabled={isCreatingLesson}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingLesson ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Создание...
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        Создать занятие
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания группы */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  {currentStep === 'group' ? 'Создание новой группы' : 'Добавление студентов'}
                </h2>
                <button
                  onClick={handleCloseCreateGroup}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Прогресс */}
              <div className="flex items-center gap-2 mb-8">
                <div className={`flex items-center gap-2 ${currentStep === 'group' ? 'text-blue-600' : 'text-green-600'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium
                    ${currentStep === 'group' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-green-600 text-white'}`}>
                    1
                  </div>
                  <span className="font-medium">Информация о группе</span>
                </div>
                <div className="w-12 h-0.5 bg-gray-300"></div>
                <div className={`flex items-center gap-2 ${currentStep === 'students' ? 'text-blue-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium
                    ${currentStep === 'students' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-600'}`}>
                    2
                  </div>
                  <span className="font-medium">Добавление студентов</span>
                </div>
              </div>

              {/* Шаг 1: Информация о группе */}
              {currentStep === 'group' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Название группы <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder="Например: ПИ-221"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Количество подгрупп (0-3)
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="0"
                        max="3"
                        value={subgroupsCount}
                        onChange={(e) => setSubgroupsCount(parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold text-blue-600 min-w-[3ch] text-center">
                        {subgroupsCount}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Студенты смогут быть распределены по {subgroupsCount} подгруппам
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      onClick={handleCloseCreateGroup}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleCreateGroup}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      Далее
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Шаг 2: Добавление студентов */}
              {currentStep === 'students' && (
                <div className="space-y-6">
                  {/* Форма добавления студента */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-800 mb-4">Добавить студента</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Фамилия <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={studentForm.last_name}
                          onChange={(e) => setStudentForm({ ...studentForm, last_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Иванов"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Имя <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={studentForm.first_name}
                          onChange={(e) => setStudentForm({ ...studentForm, first_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Иван"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Отчество
                        </label>
                        <input
                          type="text"
                          value={studentForm.middle_name}
                          onChange={(e) => setStudentForm({ ...studentForm, middle_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                          placeholder="Иванович"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Подгруппа
                        </label>
                        <select
                          value={studentForm.subgroup}
                          onChange={(e) => setStudentForm({ ...studentForm, subgroup: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        >
                          {[...Array(subgroupsCount)].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              Подгруппа {i + 1}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleAddStudent}
                      className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Добавить студента
                    </button>
                  </div>

                  {/* Список добавленных студентов */}
                  {newGroup.students.length > 0 ? (
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-medium text-gray-800">
                          Добавленные студенты ({newGroup.students.length})
                        </h3>
                      </div>

                      {/* Группировка по подгруппам */}
                      {[...Array(subgroupsCount)].map((_, i) => {
                        const subgroup = i + 1;
                        const studentsInSubgroup = getStudentsBySubgroup(subgroup);
                        
                        if (studentsInSubgroup.length === 0) return null;
                        
                        return (
                          <div key={subgroup} className="mb-4">
                            <h4 className="text-sm font-medium text-gray-600 mb-2">
                              Подгруппа {subgroup} ({studentsInSubgroup.length} {studentsInSubgroup.length === 1 ? 'студент' : 'студентов'})
                            </h4>
                            <div className="space-y-2">
                              {studentsInSubgroup.map((student) => (
                                <div
                                  key={student.id}
                                  className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
                                >
                                  <div>
                                    <p className="font-medium text-gray-800">
                                      {student.last_name} {student.first_name} {student.middle_name}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleRemoveStudent(student.id)}
                                    className="p-1 hover:bg-red-100 rounded-full transition-colors group"
                                    title="Удалить студента"
                                  >
                                    <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                      <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Пока нет добавленных студентов</p>
                      <p className="text-sm text-gray-400 mt-1">Добавьте первого студента</p>
                    </div>
                  )}

                  {/* Кнопки действий */}
                  <div className="flex justify-between gap-3 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setCurrentStep('group')}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                      disabled={isCreatingGroup}
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Назад
                    </button>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleCloseCreateGroup}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        disabled={isCreatingGroup}
                      >
                        Отмена
                      </button>
                      <button
                        onClick={handleSaveGroup}
                        disabled={newGroup.students.length === 0 || isCreatingGroup}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isCreatingGroup ? (
                          <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Сохранение...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            Сохранить группу
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;