const { Router } = require('express');
const express = require('express');
const app = express();
const router = Router();


const { loginClient, getStations, getStation, search, getEstimate, populateDb, createUser} = require('../controllers/globalController');

router.post('/grupo-E/login', loginClient);
router.post('/grupo-E/createUser/',createUser);
router.get('/context/stations', getStations);
router.get('/context/:codigo/stations', getStation);
router.post('/context/search', search);
router.get('/context/:indicador/:latitud/:longitud/estimate', getEstimate);
router.get('/context/populate', populateDb);

app.use('/', router);

module.exports = app;