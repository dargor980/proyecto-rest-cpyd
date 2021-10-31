const { Router } = require('express');
const express = require('express');
const app = express();
const router = Router();
const middleware = require('./middleware/auth');

const { loginClient, getStations, getStation, search, getEstimate, populateDb, createUser} = require('../controllers/globalController');

router.post('/grupo-E/login', loginClient);
router.post('/grupo-E/createUser/',createUser);
router.get('/grupo-E/stations',middleware.checkToken, getStations);
router.get('/grupo-E/:codigo/stations', getStation);
router.post('/grupo-E/search', search);
router.get('/grupo-E/:indicador/:latitud/:longitud/estimate', getEstimate);
router.get('/grupo-E/populate', populateDb);

app.use('/', router);

module.exports = app;