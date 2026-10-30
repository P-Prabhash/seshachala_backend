const express = require('express');
const multer = require('multer');
const path = require('path');
const studentController = require('../controllers/student.controller');
const authenticate = require('../middleware/authenticate');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../../seshachala_frontend/static/uploads/students'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `student_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG and WEBP student photos are allowed.'));
    }
  }
});

const router = express.Router();

router.use(authenticate);

router.get('/students', studentController.getStudents);
router.get('/students/add', studentController.getAddStudent);
router.post('/students/add', upload.fields([{ name: 'student_photo', maxCount: 1 }]), studentController.postAddStudent);
router.get('/students/:id', studentController.getStudentView);
router.get('/students/:id/edit', studentController.getEditStudent);
router.post('/students/:id/edit', upload.fields([{ name: 'student_photo', maxCount: 1 }]), studentController.postEditStudent);
router.post('/students/delete', studentController.postDeleteStudent);

router.get('/api/students/:id', studentController.getStudentApi);

module.exports = router;
