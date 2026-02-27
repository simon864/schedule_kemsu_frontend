import React from 'react';

interface AttendanceChartProps {
  data: number[];
  labels: string[];
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ data, labels }) => {
  const maxValue = Math.max(...data, 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="font-medium text-gray-800 mb-4">Посещаемость по дням</h3>
      
      <div className="flex items-end justify-between h-40 gap-2">
        {data.map((value, index) => (
          <div key={index} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600"
              style={{ height: `${(value / maxValue) * 100}%` }}
            />
            <span className="text-xs text-gray-500 mt-2">{labels[index]}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Среднее: 12 чел.</span>
          <span className="text-gray-600">Максимум: {maxValue} чел.</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceChart;