import React, { useState, useEffect } from 'react';
import { useSongRequests } from '../hooks/useSongRequests';
import { SongRequest } from '../types';
import { HeadphoneIcon } from '../components/icons/HeadphoneIcon';
import { ClockIcon } from '../components/icons/ClockIcon';

const TodaysRequestsPage: React.FC = () => {
  const { requests, loading, error } = useSongRequests();
  const [todaysRequests, setTodaysRequests] = useState<SongRequest[]>([]);

  // サーバー時間ではなく、クライアントの現在日付を取得
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // リクエストをフィルタリングして今日の分だけ取得する
  useEffect(() => {
    const todayStr = getTodayString();
    const filtered = requests
      .filter(req => new Date(req.timestamp).toISOString().split('T')[0] === todayStr);
    setTodaysRequests(filtered);
  }, [requests]);

  if (loading) {
    return <div className="text-center text-xl text-gray-600">読み込み中...</div>;
  }

  if (error) {
    return <div className="text-center text-xl text-red-600 bg-red-100 p-4 rounded-lg">{error}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-center mb-8">
        <HeadphoneIcon className="w-12 h-12 text-radio-blue" />
        <h2 className="text-3xl font-bold text-center text-gray-800 ml-4">今日のリクエスト一覧</h2>
      </div>
      
      {todaysRequests.length === 0 ? (
        <p className="text-center text-gray-500 bg-white p-8 rounded-lg shadow">今日はまだリクエストがありません。</p>
      ) : (
        <div className="space-y-4">
          {todaysRequests.map(req => (
            <div key={req.id} className="bg-white p-5 rounded-lg shadow-md border border-gray-200 animate-fade-in">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                <div>
                  <h3 className="text-xl font-bold text-radio-blue">{req.songTitle}</h3>
                  <p className="text-md text-gray-700">{req.artistName}</p>
                  <p className="text-sm text-gray-500 mt-1">from: {req.nickname}</p>
                </div>
                <div className="flex items-center text-sm text-gray-500 mt-3 sm:mt-0">
                  <ClockIcon className="w-4 h-4 mr-1"/>
                  <span>{new Date(req.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// CSS in JS for animation
const style = document.createElement('style');
style.innerHTML = `
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fade-in 0.5s ease-out forwards;
}
`;
document.head.appendChild(style);


export default TodaysRequestsPage;