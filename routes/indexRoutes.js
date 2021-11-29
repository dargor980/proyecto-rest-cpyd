const { Router } = require('express');
const express = require('express');
const app = express();
const router = Router();
const middleware = require('../middleware/auth');

const { loginClient, getStations, getStation, search, getEstimate, populateDb, createUser, daily} = require('../controllers/globalController');

router.post('/grupo-E/login', loginClient);
router.post('/grupo-E/createUser/',createUser);
router.post('/grupo-E/:indicador/:fechadesde/:fechahasta/search',middleware.checkToken, search); // ,precipitacion, tmax, tmin
router.get('/grupo-E/stations',middleware.checkToken, getStations);
router.get('/grupo-E/:codigo/stations',middleware.checkToken, getStation);
router.get('/grupo-E/daily',middleware.checkToken, daily);
router.get('/grupo-E/:indicador/:latitud/:longitud/estimate',middleware.checkToken, getEstimate);
router.get('/grupo-E/populate',middleware.checkToken, populateDb);

app.use('/', router);

module.exports = app;