const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

// ========== НАСТРОЙКИ TELEGRAM (ЗАМЕНИТЕ НА СВОИ) ==========
// 1. Создайте бота у @BotFather в Telegram, получите токен
// 2. Напишите боту команду /start
// 3. Получите свой chat_id через @userinfobot
const TELEGRAM_BOT_TOKEN = '8662933666:AAH6G90rTYGwXCG6rfPTfCEBgbssBF-dLMk';  // ЗАМЕНИТЕ!
const TELEGRAM_CHAT_ID = '5915959191';       // ЗАМЕНИТЕ!
// ============================================================

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

const RESULTS_FILE = path.join(__dirname, 'test_results.json');

if (!fs.existsSync(RESULTS_FILE)) {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify([], null, 2));
}

// Функция отправки уведомления в Telegram
async function sendTelegramNotification(userId, userName, score, total, date) {
    if (TELEGRAM_BOT_TOKEN === 'ВАШ_ТОКЕН_БОТА' || TELEGRAM_CHAT_ID === 'ВАШ_CHAT_ID') {
        console.log('⚠️ Telegram не настроен. Замените TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в server.js');
        return false;
    }
    
    const message = `📜 *НОВЫЙ РЕЗУЛЬТАТ ТЕСТА* 📜\n\n` +
                    `👤 *Пользователь:* ${userName} (${userId})\n` +
                    `📊 *Результат:* ${score}/${total} баллов\n` +
                    `📅 *Дата:* ${date}\n` +
                    `📈 *Процент:* ${Math.round(score/total*100)}%\n\n` +
                    `🏆 *Молодец!* Продолжай изучать историю просвещения!`;
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            })
        });
        const result = await response.json();
        console.log('Telegram уведомление отправлено:', result.ok ? '✅' : '❌');
        return result.ok;
    } catch (err) {
        console.error('Ошибка отправки Telegram:', err);
        return false;
    }
}

// Маршрут для сохранения результатов
app.post('/api/save-result', async (req, res) => {
    const { userId, userName, score, totalQuestions, answers, timestamp } = req.body;
    
    let results = [];
    try {
        const data = fs.readFileSync(RESULTS_FILE, 'utf8');
        results = JSON.parse(data);
    } catch (err) {
        console.error('Ошибка чтения файла:', err);
    }
    
    const newResult = {
        id: Date.now(),
        userId,
        userName,
        score,
        totalQuestions,
        answers,
        timestamp: timestamp || new Date().toISOString(),
        date: new Date().toLocaleString('ru-RU')
    };
    
    results.push(newResult);
    
    try {
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2), 'utf8');
        
        // Отправляем уведомление в Telegram
        await sendTelegramNotification(userId, userName, score, totalQuestions, newResult.date);
        
        res.json({ success: true, message: 'Результаты сохранены! Уведомление отправлено.' });
    } catch (err) {
        console.error('Ошибка сохранения:', err);
        res.status(500).json({ success: false, message: 'Ошибка сохранения' });
    }
});

// Маршрут для получения результатов
app.get('/api/get-results', (req, res) => {
    try {
        const data = fs.readFileSync(RESULTS_FILE, 'utf8');
        const results = JSON.parse(data);
        res.json(results);
    } catch (err) {
        res.json([]);
    }
});

app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║   📜 СЕРВЕР ЗАПУЩЕН 📜                                       ║
║   🌐 http://localhost:${PORT}                                  ║
║   💾 Результаты: ${RESULTS_FILE}                           ║
║   📱 Telegram уведомления: ${TELEGRAM_BOT_TOKEN !== 'ВАШ_ТОКЕН_БОТА' ? '✅ ВКЛЮЧЕНЫ' : '❌ НЕ НАСТРОЕНЫ'} ║
╚══════════════════════════════════════════════════════════════╝
    `);
});
