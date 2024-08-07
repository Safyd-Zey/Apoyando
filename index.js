// app.js

const express = require('express');
const mongoose = require('mongoose');
const ejs = require('ejs');
const bodyParser = require('body-parser'); // Добавлено для обработки данных формы
const multer = require('multer'); 
const cloudinary = require('cloudinary').v2;

const app = express();
const port = 3000;

cloudinary.config({ 
  cloud_name: 'dm1fkeon6', 
  api_key: '753529946954764', 
  api_secret: 'kx_B3FMK1CyDwvB4JBaXJtCLjFc' 
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
    achievements: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' }] // Ссылка на достижения
});

const Profile = mongoose.model('Profile', profileSchema);

const achievementSchema = new mongoose.Schema({
    achievement: String,
    description: String,
    photo: String
});

const Achievement = mongoose.model('Achievement', achievementSchema);

// Указываем директорию для хранения загруженных файлов
const storage = multer.diskStorage({});

// Маршрут для отображения профилей
app.get('/profiles', async(req,res)=>{
  try {
    const profiles = await Profile.find().sort({ points: -1 }).populate('achievements'); // Загружаем достижения для каждого профиля
      res.render('profiles', { profiles });
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});

app.get('/', async (req, res) => {
  try {
    res.render('index');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
// Маршрут для отображения страницы достижений и добавления их к профилю
app.get('/achievements', async (req, res) => {
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
app.post('/add_achievements_to_profile', async (req, res) => {
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
app.get('/adminDauren1748', async (req, res) => {
  try {
      const profiles = await Profile.find();
      const achievements = await Achievement.find();
      res.render('admin', { profiles, achievements });
  } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
  }
});

const upload = multer({ storage: storage });

// Измененный маршрут для добавления нового пользователя с загрузкой фото в Cloudinary
app.post('/admin/addProfile', upload.single('photo'), async (req, res) => {
  try {
    const { name, details, points, status} = req.body;

    // Загрузка изображения в Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);

    // Создание нового профиля с URL-адресом фото из Cloudinary
    const newProfile = new Profile({ 
      name, 
      details, 
      photo: result.secure_url, // Используем URL-адрес изображения из Cloudinary
      points, 
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
app.post('/admin/addAchievement', upload.single('achievementPhoto'), async (req, res) => {
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
app.post('/admin/addUserAchievement', async (req, res) => {
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
app.post('/admin/deleteProfile', async (req, res) => {
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
app.post('/admin/deleteAchievement', async (req, res) => {
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
app.post('/admin/removeUserAchievement', async (req, res) => {
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
app.get('/edit_profile', async (req, res) => {
  try {
    const profileId = req.query.profile;
    res.redirect(`/edit_profile/${profileId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/admin/resetPoints', async (req, res) => {
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
app.post('/admin/resetPoints2', async (req, res) => {
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
app.get('/profiles_for_admin', async (req, res) => {
  try {
    const profiles = await Profile.find().sort({ points: -1 }).populate('achievements'); 
    const achievements = await Achievement.find();
    res.render('profiles_for_admin', { profiles, achievements });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});



// Маршрут для изменения статуса профиля
app.post('/profiles_for_admin/change_status', async (req, res) => {
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
    // Рендеринг страницы рейтинга с данными о профилях
    res.render('rating', { profiles });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/rating_for_admin', async (req, res) => {
  try {
    // Получить список профилей, отсортированный по убыванию количества баллов
    const profiles = await Profile.find().sort({ points: -1 }).populate('achievements');
    const achievements = await Achievement.find();
    res.render('rating_for_admin', { profiles, achievements });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
// Маршрут для добавления баллов к профилю
app.post('/rating_for_admin/addPoints', async (req, res) => {
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
app.post('/rating_for_admin/addUserAchievement', async (req, res) => {
  try {
    const { profileId, achievementId } = req.body;

    // Find profile by id
    const userProfile = await Profile.findById(profileId);

    if (!userProfile) {
      return res.status(404).send('User not found');
    }

    // Find achievement by id
    const achievement = await Achievement.findById(achievementId);

    if (!achievement) {
      return res.status(404).send('Achievement not found');
    }

    // Add achievement to user profile
    userProfile.achievements.push(achievement);

    // Save updated profile
    await userProfile.save();

    res.redirect('/rating_for_admin');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});
app.post('/rating_for_admin/updatePoints', async (req, res) => {
    try {
        const profiles = req.body.profiles;
        if (!profiles) {
            throw new Error("No profiles data received.");
        }

        for (const profileData of Object.values(profiles)) {
            const { profileId, pointsToAdd } = profileData;
            const points = parseFloat(pointsToAdd) || 0;

            await Profile.findByIdAndUpdate(profileId, {
                $inc: { points: points }
            });
        }

        res.redirect('/rating_for_admin');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error updating points.');
    }
});


// Маршрут для отображения страницы редактирования профиля
app.get('/edit_profile/:profileId', async (req, res) => {
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
app.post('/edit_profile/:profileId', upload.single('photo'), async (req, res) => {
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


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
