// index.js

const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');
const bodyParser = require('body-parser'); // Добавлено для обработки данных формы
const multer = require('multer'); 
const cloudinary = require('cloudinary').v2;
const session = require('express-session');
const flash = require('connect-flash');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const port = 3000;

cloudinary.config({ 
  cloud_name: 'dm1fkeon6', 
  api_key: '753529946954764', 
  api_secret: 'kx_B3FMK1CyDwvB4JBaXJtCLjFc' 
});
// Настройка сессий
app.use(
  session({
    secret: 'ваш_секретный_ключ',
    resave: false,
    saveUninitialized: false,
  })
);

// Настройка флэш-сообщений
app.use(flash());



// Middleware для передачи флэш-сообщений в шаблоны
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true })); // Добавлено для обработки данных формы
app.set('view engine', 'ejs');

mongoose.connect('mongodb+srv://sayzey74:Dauren123Shambul@cluster0.pg4fvmr.mongodb.net/Apoyando?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Error connecting to MongoDB:', err));


  const profileSchema = new mongoose.Schema({
    name: String,
    details: String,
    photo: String,
    status: String,
    points: { type: Number, default: 0 }, // Добавлено поле для количества баллов
    cumulativePoints: { type: Number, default: 0 },
    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' }] // Ссылка на достижения
});

const Profile = mongoose.model('Profile', profileSchema);

const achievementSchema = new mongoose.Schema({
    achievement: String,
    description: String,
    photo: String
});

const Achievement = mongoose.model('Achievement', achievementSchema);

const groupSchema = new mongoose.Schema({
  name: String,
  image: String,
  color: String, // HEX-код цвета
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Profile' }] // Ссылки на участников
});

const Group = mongoose.model('Group', groupSchema);

const imageSchema = new mongoose.Schema({
  url: String,
  description: String,
});

const Image = mongoose.model('Image', imageSchema);

const AdminActionLogSchema = new mongoose.Schema({
  action: String,
  profileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profile'
  },
  profileName: String,
  pointsAdded: Number,
  achievementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  },
  achievementName: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const AdminActionLog = mongoose.model('AdminActionLog', AdminActionLogSchema);

// Указываем директорию для хранения загруженных файлов
const storage = multer.diskStorage({});
const upload = multer({ storage: storage });




// Страница входа
app.get('/login', (req, res) => {
  res.render('login'); // Создайте шаблон login.ejs или pug
});

// Обработка входа
app.post('/login', (req, res) => {
  const { password } = req.body;
  const validPassword = 'ilovesayat';

  if (password === validPassword) {
    req.session.isAuthenticated = true;
    req.flash('success', 'Вы успешно вошли!');
    res.redirect('/adminDauren1748');
  } else {
    req.flash('error', 'Неверный пароль!');
    res.redirect('/login');
  }
});

function isAuthenticated(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  req.flash('error', 'Пожалуйста, войдите для доступа к этой странице.');
  res.redirect('/login');
}


// Маршрут для отображения профилей
app.get('/profiles', async(req,res)=>{
  try {
    const profiles = await Profile.find().sort({ cumulativePoints: -1 }).populate('achievements'); // Загружаем достижения для каждого профиля
      res.render('profiles', { profiles });
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/', async (req, res) => {
  try {
    const images = await Image.find();
    res.render('index', { images });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Настройка cron для выполнения задачи каждую минуту
cron.schedule('* * * * *', async () => {
  try {
      const response = await axios.get('http://localhost:3000/profiles');
  } catch (error) {
      console.error('Error sending GET request to /profiles:', error);
  }
});

app.get('/admin_images', isAuthenticated, async (req, res) => {
  try {
    const images = await Image.find();
    res.render('admin_images', { images });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Маршрут для добавления нового изображения
app.post('/admin_images/add', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { description } = req.body;

    // Загрузка изображения в Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);

    // Сохранение изображения в базе данных
    const newImage = new Image({ url: result.secure_url, description });
    await newImage.save();

    req.flash('success', 'Изображение успешно добавлено!');
    res.redirect('/admin_images');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при добавлении изображения!');
    res.redirect('/admin_images');
  }
});

app.post('/admin_images/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    // Удаление из базы данных
    await Image.findByIdAndDelete(id);

    req.flash('success', 'Изображение успешно удалено!');
    res.redirect('/admin_images');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Ошибка при удалении изображения!');
    res.redirect('/admin_images');
  }
});


// Маршрут для отображения страницы достижений и добавления их к профилю
app.get('/achievements',isAuthenticated, async (req, res) => {
  try {
    const profiles = await Profile.find();
    const achievements = await Achievement.find();
    res.render('achievements', { profiles, achievements });
} catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
}
});

// Маршрут для добавления выбранных достижений к профилю
app.post('/add_achievements_to_profile',isAuthenticated, async (req, res) => {
  try {
    const { profile, achievements } = req.body;

    // Найдите профиль по идентификатору
    const userProfile = await Profile.findById(profile);

    if (!userProfile) {
        return res.status(404).send('User not found');
    }

    // Проверяем, является ли achievements массивом
    const achievementsArray = Array.isArray(achievements) ? achievements : [achievements];

    // Добавьте выбранные достижения к профилю
    for (const achievementId of achievementsArray) {
        const achievement = await Achievement.findById(achievementId);
        if (achievement) {
            userProfile.achievements.push(achievement);
        }
    }


    // Сохраните обновленный профиль
    await userProfile.save();

    res.redirect('/achievements');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});




// Маршрут для администраторской панели
app.get('/adminDauren1748', isAuthenticated, async (req, res) => {
  try {
      const profiles = await Profile.find();
      const achievements = await Achievement.find();
      res.render('admin', { profiles, achievements });
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});



// Измененный маршрут для добавления нового пользователя с загрузкой фото в Cloudinary
app.post('/admin/addProfile',isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const { name, details, points, status} = req.body;
    const cumulativePoints = points;

    // Загрузка изображения в Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);

    // Создание нового профиля с URL-адресом фото из Cloudinary
    const newProfile = new Profile({ 
      name, 
      details, 
      photo: result.secure_url, // Используем URL-адрес изображения из Cloudinary
      points, 
      cumulativePoints,
      status
    });

    // Сохраняем новый профиль
    await newProfile.save();

    res.redirect('/adminDauren1748');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
// Маршрут для добавления новых достижений
app.post('/admin/addAchievement',isAuthenticated, upload.single('achievementPhoto'), async (req, res) => {
  try {
      const { achievement, description } = req.body;
      // Загрузка изображения в Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
      const newAchievement = new Achievement({ achievement, description, photo: result.secure_url });
      await newAchievement.save();
      res.redirect('/adminDauren1748');
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});

// Маршрут для добавления достижения для существующего пользователя
app.post('/admin/addUserAchievement',isAuthenticated, async (req, res) => {
  try {
      const { userId, achievementId } = req.body;

      // Найдите профиль пользователя
      const userProfile = await Profile.findById(userId);

      if (!userProfile) {
          return res.status(404).send('User not found');
      }

      // Найдите достижение
      const achievement = await Achievement.findById(achievementId);

      if (!achievement) {
          return res.status(404).send('Achievement not found');
      }

      // Добавьте достижение к профилю пользователя
      userProfile.achievements.push(achievement);

      // Сохраните обновленный профиль пользователя
      await userProfile.save();

      res.redirect('/adminDauren1748');
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});
// Удаление профиля
app.post('/admin/deleteProfile',isAuthenticated, async (req, res) => {
  try {
    const { profileId } = req.body;

    // Удаление профиля
    await Profile.findByIdAndDelete(profileId);

    res.redirect('/adminDauren1748');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Удаление достижения
app.post('/admin/deleteAchievement',isAuthenticated, async (req, res) => {
  try {
    const { achievementId } = req.body;

    // Удаление достижения
    await Achievement.findByIdAndDelete(achievementId);

    res.redirect('/adminDauren1748');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Маршрут для удаления достижения у существующего пользователя
app.post('/admin/removeUserAchievement',isAuthenticated, async (req, res) => {
  try {
      const { profileId, achievementId } = req.body;

      // Находим профиль по id
      const userProfile = await Profile.findById(profileId);

      if (!userProfile) {
          return res.status(404).send('User not found');
      }

      // Удаляем достижение из профиля
      userProfile.achievements = userProfile.achievements.filter(a => a != achievementId);

      // Сохраняем обновленный профиль
      await userProfile.save();

      res.redirect('/adminDauren1748'); // Редирект на страницу администратора
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});

// Маршрут для перехода на страницу редактирования профиля
app.get('/edit_profile',isAuthenticated, async (req, res) => {
  try {
    const profileId = req.query.profile;
    res.redirect(`/edit_profile/${profileId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/admin/resetPoints',isAuthenticated, async (req, res) => {
  try {
    // Находим все профили со статусом "active"
    const activeProfiles = await Profile.find({ status: 'active' });

    // Обновляем количество баллов каждого профиля на 0
    await Promise.all(activeProfiles.map(async (profile) => {
      profile.points = 0;
      await profile.save();
    }));

    res.redirect('/adminDauren1748'); // Редирект на страницу администратора
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
app.post('/admin/resetPoints2',isAuthenticated, async (req, res) => {
  try {
    // Находим все профили со статусом "active"
    const activeProfiles = await Profile.find({ status: 'inactive' });

    // Обновляем количество баллов каждого профиля на 0
    await Promise.all(activeProfiles.map(async (profile) => {
      profile.points = 0;
      await profile.save();
    }));

    res.redirect('/adminDauren1748'); // Редирект на страницу администратора
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Маршрут для отображения страницы профилей для администратора
app.get('/profiles_for_admin',isAuthenticated, async (req, res) => {
  try {
    const profiles = await Profile.find().sort({ cumulativePoints: -1 }).populate('achievements'); 
    const achievements = await Achievement.find();
    res.render('profiles_for_admin', { profiles, achievements });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});



// Маршрут для изменения статуса профиля
app.post('/profiles_for_admin/change_status',isAuthenticated, async (req, res) => {
  try {
    const { profileId, status } = req.body;

    // Находим профиль по идентификатору
    const userProfile = await Profile.findById(profileId);

    if (!userProfile) {
      return res.status(404).send('User not found');
    }

    // Обновляем статус профиля
    userProfile.status = status;

    // Сохраняем обновленный профиль
    await userProfile.save();

    res.redirect('/profiles_for_admin'); // Редирект на страницу профилей для администратора
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});




// Маршрут для отображения рейтинга профилей
app.get('/rating', async (req, res) => {
  try {
    // Получить список профилей, отсортированный по убыванию количества баллов
    const profiles = await Profile.find().sort({ points: -1 }).populate('achievements');
        // Получить список профилей, отсортированный по убыванию количества баллов
        const profilesCumulative = await Profile.find().sort({ cumulativePoints: -1 }).populate('achievements');
    const achievements = await Achievement.find();
    const adminLogs = await AdminActionLog.find().sort({ createdAt: -1 }).limit(500);
  
    res.render('rating', {
      profiles,
      profilesCumulative,
      achievements,
      adminLogs
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/rating_for_admin',isAuthenticated, async (req, res) => {
  try {
    // Получить список профилей, отсортированный по убыванию количества баллов
    const profiles = await Profile.find().sort({ points: -1 }).populate('achievements');
        // Получить список профилей, отсортированный по убыванию количества баллов
        const profilesCumulative = await Profile.find().sort({ cumulativePoints: -1 }).populate('achievements');
    const achievements = await Achievement.find();
    const adminLogs = await AdminActionLog.find().sort({ createdAt: -1 }).limit(500);
  
    res.render('rating_for_admin', {
      profiles,
      profilesCumulative,
      achievements,
      adminLogs
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


// Маршрут для добавления баллов к профилю
app.post('/rating_for_admin/addPoints',isAuthenticated, async (req, res) => {
  try {
      const { profileId, pointsToAdd } = req.body;

      // Найдите профиль по идентификатору
      const userProfile = await Profile.findById(profileId);

      if (!userProfile) {
          return res.status(404).send('User not found');
      }

      // Добавьте баллы к профилю
      userProfile.points += parseInt(pointsToAdd);

      // Сохраните обновленный профиль
      await userProfile.save();

      res.redirect('/rating_for_admin');
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});


app.post('/rating_for_admin/addUserAchievement',isAuthenticated, async (req, res) => {
  const { profileId, achievementId } = req.body;
  const profile = await Profile.findById(profileId);
  const achievement = await Achievement.findById(achievementId);

  profile.achievements.push(achievement);
  await profile.save();

  await AdminActionLog.create({
    action: `${profile.name} получил достижение "${achievement.achievement}"`,
    profileId: profile._id,
    profileName: profile.name,
    achievementId: achievement._id,
    achievementName: achievement.achievement
  });

  res.redirect('/rating_for_admin');
});


app.post('/rating_for_admin/updatePoints',isAuthenticated ,async (req, res) => {
  const { profiles } = req.body;

  for (let index in profiles) {
    const profileId = profiles[index].profileId;
    const pointsToAdd = parseInt(profiles[index].pointsToAdd);

    if (!isNaN(pointsToAdd) && pointsToAdd !== 0) {
      const profile = await Profile.findById(profileId);
      profile.points += pointsToAdd;
      profile.cumulativePoints += pointsToAdd;
      await profile.save();

      await AdminActionLog.create({
        action: `Добавлено ${pointsToAdd} балла ${profile.name}`,
        profileId: profile._id,
        profileName: profile.name,
        pointsAdded: pointsToAdd
      });
    }
  }

  res.redirect('/rating_for_admin');
});



// Маршрут для отображения страницы редактирования профиля
app.get('/edit_profile/:profileId',isAuthenticated, async (req, res) => {
  try {
    const profileId = req.params.profileId;
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).send('Profile not found');
    }
    res.render('edit_profile', { profile });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

// Маршрут для обновления данных профиля
app.post('/edit_profile/:profileId',isAuthenticated, upload.single('photo'), async (req, res) => {
  try {
    const profileId = req.params.profileId;
    const { name, details } = req.body;
    let photoUrl = req.body.currentPhotoUrl; // Изменение по умолчанию
    if (req.file) {
    // Загрузка изображения в Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
      photoUrl = result.secure_url;
    }
    // Обновление данных профиля
    await Profile.findByIdAndUpdate(profileId, { name, details, photo: photoUrl });
    res.redirect('/adminDauren1748');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/groups', async (req, res) => {
  try {
    // Получаем группы с участниками и их достижениями
    const groups = await Group.find()
      .populate({
        path: 'members',
        populate: { path: 'achievements' },
      });

    // Вычисляем общий балл для каждой группы
    groups.forEach(group => {
      group.totalPoints = group.members.reduce((sum, member) => sum + (member.points || 0), 0);
    });

    // Сортируем группы по количеству баллов в порядке убывания
    groups.sort((a, b) => b.totalPoints - a.totalPoints);

    res.render('groups', { groups }); // Рендерим отсортированные группы
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/admin_groups',isAuthenticated, async (req, res) => {
  try {
    // Получаем группы с участниками и их достижениями
    const groups = await Group.find()
      .populate({
        path: 'members', // Связь с участниками
        populate: { path: 'achievements' }, // Подгрузка достижений для участников
      });
    const profiles = await Profile.find().populate('achievements'); 

// Добавляем общий балл для каждой группы
groups.forEach(group => {
  group.totalPoints = group.members.reduce((sum, member) => sum + (member.points || 0), 0);
});
    res.render('admin_groups', { profiles, groups });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});


app.post('/admin_groups/create',isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, color, members } = req.body;

    // Загрузка изображения в Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);

    // Создание новой группы
    const newGroup = new Group({
      name,
      image: result.secure_url,
      color,
      members: Array.isArray(members) ? members : [members] // Убедимся, что это массив
    });

    await newGroup.save();
    res.redirect('/admin_groups');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/admin_groups/edit/:groupId',isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, color, members } = req.body;

    let imageUrl;
    if (req.file) {
      // Если новое изображение было загружено
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
    }

    await Group.findByIdAndUpdate(groupId, {
      name,
      color,
      image: imageUrl || req.body.currentImageUrl, // Используем новое или текущее изображение
      members: Array.isArray(members) ? members : [members]
    });

    res.redirect('/admin_groups');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/admin_groups/delete',isAuthenticated, async (req, res) => {
  try {
    const { groupId } = req.body;
    await Group.findByIdAndDelete(groupId);
    res.redirect('/admin_groups');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});