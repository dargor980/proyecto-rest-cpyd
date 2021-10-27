const request = require('request-promise');
const cheerio = require('cheerio');
const { Pool } = require('pg');


const pool = new Pool({
    host:'localhost',
    user:'senku',
    password:'root',
    database:'paralela',
    port:'5432'
});

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
    const datos = await init();
    res.json(datos)
}

const getStation = async (req, res) => {

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