const { Router } = require('express');
const express = require('express');
const app = express();
const router = Router();


const { loginClient, getStations, getStation, search, getEstimate} = require('../controllers/globalController');

router.post('/context/login', loginClient);
router.get('/context/stations', getStations);
router.get('/context/:codigo/stations', getStation);
router.post('/context/search', search);
router.get('/context/:indicador/:latitud/:longitud/estimate', getEstimate);

module.exports = app;