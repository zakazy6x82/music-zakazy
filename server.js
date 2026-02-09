const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Конфигурация загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Неподдерживаемый формат файла'));
        }
    },
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Чтение метаданных аудиофайлов (упрощённая версия)
const getAudioMetadata = (filePath) => {
    return new Promise((resolve) => {
        const stats = fs.statSync(filePath);
        const filename = path.basename(filePath);
        
        // В реальном приложении используйте библиотеку like 'music-metadata'
        const metadata = {
            id: filename,
            title: path.parse(filename).name,
            artist: 'Неизвестный исполнитель',
            file: filename,
            duration: 0,
            cover: null,
            uploaded: stats.birthtime
        };
        
        resolve(metadata);
    });
};

// API: Получить все треки
app.get('/api/tracks', async (req, res) => {
    try {
        const uploadsDir = path.join(__dirname, 'uploads');
        
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir);
            return res.json([]);
        }
        
        const files = fs.readdirSync(uploadsDir)
            .filter(file => ['.mp3', '.wav', '.ogg'].includes(path.extname(file).toLowerCase()));
        
        const tracks = await Promise.all(
            files.map(file => getAudioMetadata(path.join(uploadsDir, file)))
        );
        
        res.json(tracks);
    } catch (error) {
        console.error('Ошибка получения треков:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// API: Загрузить трек
app.post('/api/upload', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Файл не загружен' });
        }
        
        const metadata = await getAudioMetadata(req.file.path);
        
        res.json({ 
            success: true, 
            track: metadata,
            message: 'Файл успешно загружен' 
        });
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Удалить трек
app.delete('/api/track/:id', (req, res) => {
    try {
        const filePath = path.join(__dirname, 'uploads', req.params.id);
        
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Файл не найден' });
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Папка для загрузок: ${path.join(__dirname, 'uploads')}`);
});