import React, { useState, useEffect } from 'react';
import { SongRequest } from '../types';
import { useSongRequests } from '../hooks/useSongRequests';
import { ADMIN_PASSWORD } from '../constants';
import { LockIcon } from '../components/icons/LockIcon';
import { TrashIcon } from '../components/icons/TrashIcon';
import { CheckCircleIcon } from '../components/icons/CheckCircleIcon';
import { XCircleIcon } from '../components/icons/XCircleIcon';

const AdminLogin: React.FC<{ onLogin: (success: boolean) => void }> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      onLogin(true);
      sessionStorage.setItem('admin_auth', 'true'); // セッションストレージに認証状態を保存
    } else {
      setError('パスワードが違います。');
      onLogin(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow-lg border">
      <div className="flex items-center justify-center mb-6">
        <LockIcon className="w-10 h-10 text-radio-yellow" />
        <h2 className="text-2xl font-bold text-center ml-3">管理画面ログイン</h2>
      </div>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">パスワード</label>
          <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-radio-blue focus:border-radio-blue" required />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-radio-blue hover:bg-radio-blue-dark focus:outline-none">
          ログイン
        </button>
      </form>
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const { requests, updateRequestStatus, deleteRequest, loading, error } = useSongRequests();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const groupedRequests = requests.reduce((acc, req) => {
    const date = new Date(req.timestamp).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(req);
    return acc;
  }, {} as Record<string, SongRequest[]>);

  const exportToCSV = () => {
    let filteredRequests = requests;
    if (startDate) {
      filteredRequests = filteredRequests.filter(req => new Date(req.timestamp) >= new Date(startDate));
    }
    if (endDate) {
      // 終了日はその日の終わりまでを含むように調整
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filteredRequests = filteredRequests.filter(req => new Date(req.timestamp) <= end);
    }

    const headers = ['ID', '日時', '曲名', 'アーティスト名', 'ニックネーム', 'メッセージ', '既読'];
    const csvContent = [
      headers.join(','),
      ...filteredRequests.map(req => [
        req.id,
        new Date(req.timestamp).toLocaleString('ja-JP'),
        `"${req.songTitle.replace(/"/g, '""')}"`,
        `"${req.artistName.replace(/"/g, '""')}"`,
        `"${req.nickname.replace(/"/g, '""')}"`,
        `"${req.message ? req.message.replace(/"/g, '""').replace(/\n/g, ' ') : ''}"`,
        req.isRead ? 'はい' : 'いいえ'
      ].join(','))
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `requests_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
  const handleUpdateStatus = async (id: string, isRead: boolean) => {
    try {
      await updateRequestStatus(id, !isRead);
    } catch (err) {
      console.error(err);
      alert('ステータスの更新に失敗しました。');
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (window.confirm('このリクエストを本当に削除しますか？この操作は元に戻せません。')) {
      try {
        await deleteRequest(id);
      } catch (err) {
        console.error(err);
        alert('リクエストの削除に失敗しました。');
      }
    }
  };


  if (loading) return <div className="text-center">読み込み中...</div>;
  if (error) return <div className="text-center text-xl text-red-600 bg-red-100 p-4 rounded-lg">{error}</div>;

  return (
    <div>
        <h2 className="text-3xl font-bold mb-6 text-center">全リクエスト管理</h2>
        <div className="bg-white p-4 rounded-lg shadow-md mb-6 border">
            <h3 className="text-xl font-semibold mb-2">CSVエクスポート</h3>
            <div className="flex flex-wrap gap-4 items-end">
                <div>
                    <label className="block text-sm font-medium text-gray-700">開始日</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-radio-blue"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">終了日</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-radio-blue"/>
                </div>
                <button onClick={exportToCSV} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded transition-colors">エクスポート</button>
            </div>
        </div>

        {Object.keys(groupedRequests).length === 0 ? (
          <p className="text-center text-gray-500 mt-8">まだリクエストはありません。</p>
        ) : Object.entries(groupedRequests).map(([date, reqs]) => (
            <div key={date} className="mb-8">
                <h3 className="text-2xl font-semibold mb-4 pb-2 border-b-2 border-radio-blue">{date}</h3>
                <div className="space-y-4">
                    {reqs.map(req => (
                        <div key={req.id} className={`p-4 rounded-lg shadow border-l-4 ${req.isRead ? 'bg-gray-100 border-gray-400' : 'bg-white border-radio-yellow'}`}>
                             <div className="flex flex-col sm:flex-row justify-between">
                                <div>
                                    <p className="font-bold text-lg">{req.songTitle} - <span className="font-normal">{req.artistName}</span></p>
                                    <p>From: {req.nickname}</p>
                                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded whitespace-pre-wrap">{req.message || 'メッセージなし'}</p>
                                    <p className="text-xs text-gray-400 mt-2">{new Date(req.timestamp).toLocaleString('ja-JP')}</p>
                                </div>
                                <div className="flex items-center gap-2 mt-4 sm:mt-0 flex-shrink-0">
                                    <button onClick={() => handleUpdateStatus(req.id, req.isRead)} className={`p-2 rounded-full transition-colors ${req.isRead ? 'bg-gray-300 hover:bg-gray-400' : 'bg-green-200 hover:bg-green-300'}`}>
                                      {req.isRead ? <XCircleIcon className="w-6 h-6 text-gray-600" /> : <CheckCircleIcon className="w-6 h-6 text-green-700" />}
                                      <span className="sr-only">{req.isRead ? '未読にする' : '既読にする'}</span>
                                    </button>
                                    <button onClick={() => handleDeleteRequest(req.id)} className="p-2 rounded-full bg-red-200 hover:bg-red-300 transition-colors">
                                        <TrashIcon className="w-6 h-6 text-red-700" />
                                        <span className="sr-only">削除</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
  );
};

const AdminPage: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // セッションストレージを確認して、すでに認証済みかチェック
    if (sessionStorage.getItem('admin_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return <AdminLogin onLogin={setIsAuthenticated} />;
  }

  return <AdminDashboard />;
};

export default AdminPage;