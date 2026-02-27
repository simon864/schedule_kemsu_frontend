
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, TrendingUp, Award } from 'lucide-react';

const StudentDetailPage = () => {
  const navigate = useNavigate();
  useParams();

  // Моковые данные студента
  const student = {
    name: 'Иванов Иван Иванович',
    group: 'ФИТ-221',
    attendance: [
      { date: '22.03', status: 'present' },
      { date: '28.03', status: 'present' },
      { date: '01.04', status: 'absent' }
    ],
    stats: {
      totalClasses: 12,
      attended: 10,
      percentage: 89,
      mostMissedSubject: 'Разработка мобильных приложений',
      averagePerClass: 12,
      teaVisits: 8
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/schedule')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">Профиль студента</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{student.name}</h2>
          <p className="text-gray-500 mb-4">{student.group}</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-medium">Посещаемость</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">{student.stats.percentage}%</p>
              <p className="text-sm text-gray-600">{student.stats.attended}/{student.stats.totalClasses} занятий</p>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Award className="w-5 h-5" />
                <span className="text-sm font-medium">Пропуски</span>
              </div>
              <p className="text-2xl font-bold text-gray-800">
                {student.stats.totalClasses - student.stats.attended}
              </p>
              <p className="text-sm text-gray-600">пропущено занятий</p>
            </div>
          </div>
        </div>

        {/* Most Missed Subject */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="font-medium text-gray-800 mb-4">Самый непосещаемый предмет</h3>
          <p className="text-lg text-gray-700">{student.stats.mostMissedSubject}</p>
        </div>

        {/* Attendance History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="font-medium text-gray-800 mb-4">История посещений</h3>
          
          <div className="space-y-3">
            {student.attendance.map((record, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{record.date}</span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  record.status === 'present' 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {record.status === 'present' ? 'Был' : 'Не был'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Group Statistics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-medium text-gray-800 mb-4">Статистика группы {student.group}</h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>В среднем на паре</span>
                <span className="font-medium">{student.stats.averagePerClass} человек</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 rounded-full h-2" style={{ width: '60%' }} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Средняя посещаемость</p>
                <p className="text-xl font-bold text-gray-800">{student.stats.percentage}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Осталось пар</p>
                <p className="text-xl font-bold text-gray-800">20 пар</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => navigate(`/attendance/ФИТ-221/2025-04-07`)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Calendar className="w-5 h-5" />
          Отметить посещаемость
        </button>
      </main>
    </div>
  );
};

export default StudentDetailPage;