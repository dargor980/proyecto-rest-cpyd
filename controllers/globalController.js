const request = require('request-promise');
const cheerio = require('cheerio');
const { pool } = require('./bdConnection');
const moment = require('moment');

async function init(){
    const $ = await request({
        uri: 'https://climatologia.meteochile.gob.cl/application/diario/boletinClimatologicoDiario/actual',
        transform: body => cheerio.load(body)
    });
    const result = $(".table.table-bordered").find('tbody').find('tr').map((i,element) => ({
        nombre: $(element).find(`td:nth-of-type(1)`).text().trim(),
        valormin: $(element).find(`td:nth-of-type(2)`).text().trim(),
        horamin: $(element).find(`td:nth-of-type(3)`).text().trim(),
        valormax: $(element).find(`td:nth-of-type(4)`).text().trim(),
        horamax: $(element).find(`td:nth-of-type(5)`).text().trim(),
        '24horas' : $(element).find(`td:nth-of-type(6)`).text().trim(),
        alafecha : $(element).find(`td:nth-of-type(7)`).text().trim(),
        pasado : $(element).find(`td:nth-of-type(8)`).text().trim(),
        normalactual : $(element).find(`td:nth-of-type(9)`).text().trim(),
        defsup : $(element).find(`td:nth-of-type(10)`).text().trim(),
        normalanual : $(element).find(`td:nth-of-type(11)`).text().trim(),
        
    })).get();
    return (result);
}

init();

const loginClient = async (req, res) => {

}

const getStations = async (req, res) => {
    try{
        let stations = await pool.query('SELECT * FROM stations');
        res.status(200).json(stations.rows);
    } catch{
        res.status(412).json({
            fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
            mensaje: 'Precondición Fallida'
        });
    }
}

const getStation = async (req, res) => {
    try{
        let response = await pool.query('SELECT * FROM stations WHERE id =$1', req.params.codigo);
        if(response.rows.length = 0){
            res.status(404).json({
                fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
                mensaje: 'No encontrado'
            });
        } else {
            res.status(200).json(response.rows);
        }
    } catch {
        res.status(412).json({
            fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
            mensaje: 'Precondición Fallida'
        });
    }
}

const search = async (req, res) => {

}

const getEstimate = async (req, res) => {

}

module.exports = {
    loginClient,
    getStations,
    getStation,
    search,
    getEstimate,
}