const request = require('request-promise');
const cheerio = require('cheerio');
const { pool } = require('./bdConnection');
const moment = require('moment');
var XLSX = require('xlsx')

var fs = require('fs');
const path = require('path');
const { Console } = require('console');

const ConsoleProgressBar = require('console-progress-bar');

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

const directoryPath = path.join(__dirname, 'Estaciones');

async function readDirectoriesTxt(path){
    const dir = await fs.promises.opendir(path);

    //Progress indicator init and define total paths
    const consoleProgressBar = new ConsoleProgressBar({ maxValue: 21 });

    for await (const dirent of dir){
        const data = await fs.promises.opendir(directoryPath + '/' + dirent.name)
        for await (const files of data){
            var i = files.name.split('.').pop();

            if(i === 'txt'){

                var data2 = fs.readFileSync(directoryPath + '/' + dirent.name + '/' + files.name, 'utf8');
                var splitedInfo = data2.split(' - ');

                    var isSetQuery = 'select exists(select 1 from stations where nombre=$1)'
                    const stationsquery = 'INSERT INTO stations(nombre,latitud,longitud,altura) VALUES($1, $2, $3, $4)';
                    try {
                        var isSet = await pool.query(isSetQuery,[dirent.name])
                        if(splitedInfo.length === 3 && isSet['rows'][0]['exists'] === false){
                            await pool.query(stationsquery, [dirent.name, splitedInfo[0],splitedInfo[1],splitedInfo[2]])
                        }else if(isSet['rows'][0]['exists'] === false){
                            await pool.query(stationsquery, [dirent.name, null,null,null])
                        }
                    } catch (e) {
                            console.log(e);
                    }
                
            }
        }
        consoleProgressBar.addValue(1);
    }
    console.log('TXT DATA Finished')
}

async function readDirectoriesXls(path){
    const dir = await fs.promises.opendir(path);

    //Progress indicator init and define total paths
    const consoleProgressBar = new ConsoleProgressBar({ maxValue: 23 });

    var start = Date.now();

    console.log('Init XLSX READ');

    try {
            for await (const dirent of dir){
                const data = await fs.promises.opendir(directoryPath + '/' + dirent.name)
                console.log('Loading');
                console.log('');
                consoleProgressBar.addValue(1);
                console.log('');
                var end = Date.now();
                console.log(`Execution time: ${end - start} ms`);
                console.log('');
                for await (const files of data){
                    var i = files.name.split('.').pop();
                    if(i === 'xls'){
                        var workbook = XLSX.readFile(directoryPath + '/' + dirent.name + '/' + files.name);
        
                        var sheet_name_list = workbook.SheetNames;
        
                        var sheet_dos = workbook.SheetNames[0];
        
                        let worksheet = workbook.Sheets[sheet_dos];
        
                        //select station ID
                        const stationsQuery = 'SELECT id FROM stations WHERE nombre = $1'
        
                        //IF HEADER NOT EXIST ADD HEADERS TO ALLOW READING
        
                        XLSX.utils.sheet_add_aoa(worksheet, [['MES']], {origin: 'A1'});
        
                        XLSX.utils.sheet_add_aoa(worksheet, [['DIA']], {origin: 'B1'});
        
                        // READ A XLSX ARCHIVE AND TRANSFORM IT TO A JSON
                        var xlData = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);
                        
                        // Split File Name to get File Type where RR are Precipitation, TMax are Max Temperature and TMin are Min Temperature.
                        // Considere a archive with the structure LOCATION_TYPE_INITIALYEAR_FINALYEAR.xls
        
                        var tipoArchivo = files.name.split('_');
        
                        // INIT Month with '' because the month only came in the day one of every column loop.
                        // When we found the day and its equals to 1 we verify if the month still te same or if it changes 
                        var mesActual = '';
        
        
                        //VERIFY IF PRECIPITATION EXIST QUERY
                        var isPrecipitationQuery = 'select exists(select 1 from precipitacion where id_station=$1 AND anio=$2 AND mes=$3 AND dia=$4)'
                        //INSERT PRECIPITATION QUERY
                        const precipitationQuery = 'INSERT INTO precipitacion(milimetros,mes,dia,anio,id_station) VALUES($1, $2, $3, $4, $5)';
        
                        //VERIFY IF Tmax EXIST QUERY
                        var isTmaxQuery = 'select exists(select 1 from tmax where id_station=$1 AND anio=$2 AND mes=$3 AND dia=$4)'
                        //INSERT Tmax QUERY
                        const tMaxQuery = 'INSERT INTO tmax(temperatura,mes,dia,anio,id_station) VALUES($1, $2, $3, $4, $5)';
        
                        //VERIFY IF Tmin EXIST QUERY
                        var isTminQuery = 'select exists(select 1 from tmin where id_station=$1 AND anio=$2 AND mes=$3 AND dia=$4)'
                        //INSERT Tmin QUERY
                        const tMinQuery = 'INSERT INTO tmin(temperatura,mes,dia,anio,id_station) VALUES($1, $2, $3, $4, $5)';
                        
                        for (const itemFila of xlData){
        
                            if(itemFila['MES'] != undefined){
                                mesActual = itemFila['MES'];
                            }
        
                            if(tipoArchivo[1] === 'RR'){
        
                                try {
        
                                    var stationsId = await pool.query(stationsQuery,[dirent.name]);
                                    var actuallyID = stationsId['rows'][0]['id'];
                                    Object.entries(itemFila).forEach(async ([key,value]) => {
                                        try {
                                            if(key != 'DIA' && key != 'MES' && value != undefined && itemFila['DIA'] != null){
                                                var isPrecipitation = await pool.query(isPrecipitationQuery,[actuallyID,key,mesActual,itemFila['DIA']])
                                                var actuallyPrecipitation = isPrecipitation['rows'][0]['exists'];
                                                if(actuallyPrecipitation === false){
                                                    pool.query(precipitationQuery,[parseFloat(value),mesActual,itemFila['DIA'],key,actuallyID]);
                                                }
                                            }
                                        } catch (error) {
                                            console.log('precipitation INSERT query related issue',error);
                                        }
                                    });
                                    
        
                                } catch (error) {
                                    console.log('Precipitation Archive related issue', error);
                                }
                            }
                            if(tipoArchivo[1] === 'TMax'){
                                try {
        
                                    var stationsId = await pool.query(stationsQuery,[dirent.name]);
                                    var actuallyID = stationsId['rows'][0]['id'];
        
                                    Object.entries(itemFila).forEach(async ([key,value]) => {
                                        try {
                                            if(key != 'DIA' && key != 'MES' && value != undefined && itemFila['DIA'] != null){
                                                var isTmax = await pool.query(isTmaxQuery,[actuallyID,key,mesActual,itemFila['DIA']])
                                                var actuallyTmax = isTmax['rows'][0]['exists'];
                                                if(actuallyTmax === false){
                                                    pool.query(tMaxQuery,[parseFloat(value),mesActual,itemFila['DIA'],key,actuallyID]);
                                                }
                                            }
                                        } catch (error) {
                                            console.log('Tmax INSERT query related issue',error);
                                        }
                                    });
                                    
        
                                } catch (error) {
                                    console.log('Tmax Archive related issue', error);
                                }
                            }
                            if(tipoArchivo[1] === 'TMin'){
                                try {
        
                                    var stationsId = await pool.query(stationsQuery,[dirent.name]);
                                    var actuallyID = stationsId['rows'][0]['id'];
        
                                    Object.entries(itemFila).forEach(async ([key,value]) => {
                                        try {
                                            if(key != 'DIA' && key != 'MES' && value != undefined && itemFila['DIA'] != null){
                                                var isTmin = await pool.query(isTminQuery,[actuallyID,key,mesActual,itemFila['DIA']])
                                                var actuallyTmin = isTmin['rows'][0]['exists'];
                                                if(actuallyTmin === false){
                                                    pool.query(tMinQuery,[parseFloat(value),mesActual,itemFila['DIA'],key,actuallyID]);
                                                }
                                            }
                                        } catch (error) {
                                            console.log('Tmin INSERT query related issue',error);
                                        }
                                    });
                                    
        
                                } catch (error) {
                                    console.log('Tmin Archive related issue', error);
                                }
                            }
        
                        }
                    }
                }
            }         
        
    } catch (error) {
        console.log('AVOID QUERYES RELATED ERROR',error);      
    }

    console.log('XLSX Data Finished')
}
 
async function initData (){
    await readDirectoriesTxt(directoryPath).catch(console.error);
    await readDirectoriesXls(directoryPath).catch(console.error);
}

const loginClient = async (req, res) => {

}

const getStations = async (req, res) => {
    try{
        let stations = await pool.query('SELECT * FROM tmin');
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

const populateDb = async (req,res) => {
    try{
        initData();
        res.status(200).json('DB LOADING');
    } catch {
        res.status(412).json({
            fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
            mensaje: 'Precondición Fallida'
        });
    }
}

module.exports = {
    loginClient,
    getStations,
    getStation,
    search,
    getEstimate,
    populateDb
}