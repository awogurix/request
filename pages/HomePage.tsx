import React, { useState, useMemo } from 'react';
import { useSongRequests } from '../hooks/useSongRequests';
import { MicIcon } from '../components/icons/MicIcon';

const HomePage: React.FC = () => {
  const { addRequest } = useSongRequests();
  const [songTitle, setSongTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [nickname, setNickname] = useState('');
  const [message, setMessage] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 簡易CAPTCHAのためのランダムな数字を生成
  const [num1, num2] = useMemo(() => [Math.floor(Math.random() * 10) + 1, Math.floor(Math.random() * 10) + 1], []);
  const captchaCorrectAnswer = num1 + num2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // バリデーション
    if (!songTitle || !artistName || !nickname) {
      setError('曲名、アーティスト名、ニックネームは必須です。');
      return;
    }
    if (message.length > 300) {
      setError('メッセージは300文字以内で入力してください。');
      return;
    }
    if (parseInt(captchaAnswer, 10) !== captchaCorrectAnswer) {
      setError('計算結果が正しくありません。');
      return;
    }

    setIsSubmitting(true);
    try {
      // リクエストを追加
      await addRequest({ songTitle, artistName, nickname, message });

      // フォームをリセット
      setSongTitle('');
      setArtistName('');
      setNickname('');
      setMessage('');
      setCaptchaAnswer('');
      setSuccess('リクエストが送信されました！ありがとうございます！');
    } catch (err) {
      setError('リクエストの送信に失敗しました。後でもう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        <div className="flex items-center justify-center mb-6">
          <MicIcon className="w-12 h-12 text-radio-blue" />
          <h2 className="text-3xl font-bold text-center text-gray-800 ml-4">曲をリクエストする</h2>
        </div>
        
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
        {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="songTitle" className="block text-sm font-medium text-gray-700">曲名 <span className="text-red-500">*</span></label>
            <input type="text" id="songTitle" value={songTitle} onChange={(e) => setSongTitle(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-radio-blue focus:border-radio-blue" required />
          </div>
          <div>
            <label htmlFor="artistName" className="block text-sm font-medium text-gray-700">アーティスト名 <span className="text-red-500">*</span></label>
            <input type="text" id="artistName" value={artistName} onChange={(e) => setArtistName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-radio-blue focus:border-radio-blue" required />
          </div>
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">ニックネーム <span className="text-red-500">*</span></label>
            <input type="text" id="nickname" value={nickname} onChange={(e) => setNickname(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-radio-blue focus:border-radio-blue" required />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">メッセージ (任意)</label>
            <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={300} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-radio-blue focus:border-radio-blue"></textarea>
            <p className="text-right text-sm text-gray-500 mt-1">{message.length}/300</p>
          </div>
          <div className="bg-gray-100 p-4 rounded-md">
            <label htmlFor="captcha" className="block text-sm font-medium text-gray-700">スパム防止: {num1} + {num2} = ?</label>
            <input type="number" id="captcha" value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-radio-blue focus:border-radio-blue" required />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-radio-blue hover:bg-radio-blue-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-radio-blue transition-colors duration-300 disabled:bg-gray-400">
            {isSubmitting ? '送信中...' : 'リクエスト送信'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default HomePage;