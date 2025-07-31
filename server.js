import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: err.message });
});

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = './public/map';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // 获取当前目录下的文件数量
        fs.readdir('./public/map', (err, files) => {
            if (err) {
                console.error('读取目录失败:', err);
                cb(err);
                return;
            }
            // 计算下一个序号
            const nextNumber = files.length + 1;
            // 使用序号命名文件
            cb(null, `收藏${nextNumber}.jpg`);
        });
    }
});

const upload = multer({ storage: storage });

// 静态文件服务
app.use(express.static('public'));

// 处理地图保存请求
app.post('/api/save-map', upload.single('map'), (req, res) => {
    console.log('收到上传请求');
    console.log('请求体:', req.body);
    console.log('文件:', req.file);

    if (!req.file) {
        console.log('没有收到文件');
        return res.status(400).json({ error: '没有收到文件' });
    }

    try {
        res.json({
            message: '地图保存成功',
            filename: req.file.filename
        });
    } catch (error) {
        console.error('保存文件时出错:', error);
        res.status(500).json({ error: '保存文件失败' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`API地址: http://localhost:${PORT}/api`);
}); 