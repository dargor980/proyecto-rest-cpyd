const request = require('request-promise');
const cheerio = require('cheerio');
const { pool } = require('./bdConnection');
const moment = require('moment');
var XLSX = require('xlsx')

const jwt = require('jwt-simple');

var fs = require('fs');
const path = require('path');
const { Console } = require('console');

const ConsoleProgressBar = require('console-progress-bar');
const { parse } = require('path');

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

const daily = async (req, res) => { // Scrapping 
    var result = await init();
    res.status(200).json(result);
}
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
                        var isPrecipitationQuery = 'select exists(select 1 from precipitacion where id_station=$1 AND fecha=$2)'
                        //INSERT PRECIPITATION QUERY
                        const precipitationQuery = 'INSERT INTO precipitacion(milimetros,fecha,id_station) VALUES($1, $2, $3)';
        
                        //VERIFY IF Tmax EXIST QUERY
                        var isTmaxQuery = 'select exists(select 1 from tmax where id_station=$1 AND fecha=$2)'
                        //INSERT Tmax QUERY
                        const tMaxQuery = 'INSERT INTO tmax(temperatura,fecha,id_station) VALUES($1, $2, $3)';
        
                        //VERIFY IF Tmin EXIST QUERY
                        var isTminQuery = 'select exists(select 1 from tmin where id_station=$1 AND fecha=$2)'
                        //INSERT Tmin QUERY
                        const tMinQuery = 'INSERT INTO tmin(temperatura,fecha,id_station) VALUES($1, $2, $3)';
                        
                        for (const itemFila of xlData){
        
                            if(itemFila['MES'] != undefined){
                                mesActual = itemFila['MES'];
                                mesActual = changemonth(mesActual);
                            }
        
                            if(tipoArchivo[1] === 'RR'){
        
                                try {
        
                                    var stationsId = await pool.query(stationsQuery,[dirent.name]);
                                    var actuallyID = stationsId['rows'][0]['id'];
                                    Object.entries(itemFila).forEach(async ([key,value]) => {
                                        try {
                                            if(key != 'DIA' && key != 'MES' && value != undefined && itemFila['DIA'] != null){
                                                var fechaRR = key + '-' + mesActual + '-' + itemFila['DIA'];
                                                var isPrecipitation = await pool.query(isPrecipitationQuery,[actuallyID,fechaRR])
                                                var actuallyPrecipitation = isPrecipitation['rows'][0]['exists'];
                                                if(actuallyPrecipitation === false){
                                                    pool.query(precipitationQuery,[parseFloat(value),fechaRR,actuallyID]);
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
                                                var fechaTmax = key + '-' + mesActual + '-' + itemFila['DIA'];
                                                var isTmax = await pool.query(isTmaxQuery,[actuallyID,fechaTmax])
                                                var actuallyTmax = isTmax['rows'][0]['exists'];
                                                if(actuallyTmax === false){
                                                    pool.query(tMaxQuery,[parseFloat(value),fechaTmax,actuallyID]);
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
                                                var fechaTmin = key + '-' + mesActual + '-' + itemFila['DIA'];
                                                var isTmin = await pool.query(isTminQuery,[actuallyID,fechaTmin])
                                                var actuallyTmin = isTmin['rows'][0]['exists'];
                                                if(actuallyTmin === false){
                                                    pool.query(tMinQuery,[parseFloat(value),fechaTmin,actuallyID]);
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
function changemonth(month){
    if(month == 'enero'){
        return '01';
    }else if(month == 'febrero'){
        return '02';
    }else if(month == 'marzo'){
        return '03';
    }else if(month == 'abril'){
        return '04';
    }else if(month == 'mayo'){
        return '05';
    }else if(month == 'junio'){
        return '06';
    }else if(month == 'julio'){
        return '07';
    }else if(month == 'agosto'){
        return '08';
    }else if(month == 'septiembre'){
        return '09';
    }else if(month == 'octubre'){
        return '10';
    }else if(month == 'noviembre'){
        return '11';
    }else if(month == 'diciembre'){
        return '12';
    }else{
        return '0';
    }

} 
async function initData (){
    await readDirectoriesTxt(directoryPath).catch(console.error);
    await readDirectoriesXls(directoryPath).catch(console.error);
}
const loginClient = async (req, res) => { //Listo
    try {
        if( req.query.email == null || req.query.pass == null){
            res.status(409).json('Los parametros email y pass son requeridos');
        }else{
            var pass = req.query.pass;
            var email = req.query.email;
            const user =  await pool.query('select exists(select 1 from users where pass=$1 AND email=$2)', [pass,email]);
            if (user['rows'][0]['exists'] != false) {
                var token = createToken();
                await pool.query('UPDATE users SET token=$1 where pass=$2 AND email=$3',[token,pass,email]);
                res.status(200).json({ token: createToken()})
            } else {
                res.status(401).json({ error: 'Error en email y/o password'});
            }
        }
    } catch (error) {
        console.log(error);
        res.status(400).json(error);
    }
}
const createToken = () => { //Listo
    const payload = {
        usuarioId: 1,
        createdAt: moment().unix(),
        expiredAt: moment().add(2, 'days').unix()
    }

    return jwt.encode(payload, 'cheesburger');
}
const createUser = async (req, res) => { //Listo
    if( req.query.pass != null && req.query.email != null){
        try{
        
            let pass = req.query.pass;
            let email = req.query.email;
            let data = await pool.query('INSERT INTO users(pass,email) VALUES($1, $2)', [pass,email]);
            res.status(200).json(data.rows);
    
        }catch(e){
            res.status(409).json('El usuario ya existe.');
        }
    }else{
        res.status(400).json('Los parametros pass y email son obligatorios.');
    }
    
}
const getStations = async (req, res) => { //Listo
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
const getStation = async (req, res) => { //Listo
    try{
        let response = await pool.query('SELECT * FROM stations WHERE id=$1', [req.params.codigo]);
        if(response.rows.length == 0){
            res.status(404).json({
                fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
                mensaje: 'No encontrado'
            });
        } else {
            res.status(200).json(response.rows);
        }
    } catch (e){
        res.status(412).json({
            fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
            mensaje: e
        });
    }
}
const search = async (req, res) => { //Listo
    try {
        let fecha_desde = req.params.fechadesde;
        let fecha_hasta = req.params.fechahasta;
        console.log('fechadesde:'+ fecha_desde);
        console.log('fechasta:'+ fecha_hasta);
        var dateFormats = {
            "iso_int" : "YYYY-MM-DD",
        }
          
        function getFormat(d){
            for (var prop in dateFormats) {
                    if(moment(d, dateFormats[prop],true).isValid()){
                        return dateFormats[prop];
                    }
                }
            return null;
        }
        var formatFoundDesde = getFormat(fecha_desde); //returns "YYYY-MM-DDTHH:MM:SS"
        var formatFoundHasta = getFormat(fecha_hasta); //returns "YYYY-MM-DDTHH:MM:SS"
        if(formatFoundDesde !==null && formatFoundHasta !==null){
            if(req.params.indicador == "precipitacion"){
                console.log(req.params.indicador);           
                let response = await pool.query('SELECT * FROM precipitacion WHERE fecha >= $1 AND fecha < $2 ORDER BY fecha DESC',[fecha_desde,fecha_hasta]);
                res.status(200).json(response.rows);
            }else if(req.params.indicador == "tmax"){
                console.log(req.params.indicador);
                let response = await pool.query('SELECT * FROM tmax WHERE fecha >= $1 AND fecha < $2 ORDER BY fecha DESC',[fecha_desde,fecha_hasta]);
                res.status(200).json(response.rows);
            }else if(req.params.indicador == "tmin"){
                console.log(req.params.indicador);
                let response = await pool.query('SELECT * FROM tmin WHERE fecha >= $1 AND fecha < $2 ORDER BY fecha DESC',[fecha_desde,fecha_hasta]);
                res.status(200).json(response.rows); 
            }else{
                res.status(404).json({
                    fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
                    mensaje: 'No encontrado'
                });
            }
            
        }else{
            res.status(412).json({
                fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
                mensaje: 'Formato de fecha incorrecto, YYYY-MM-DD'
            });
        }
        
    } catch (error) {
        res.status(412).json({
            fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
            mensaje: error
        });
    }
}
const getEstimate = async (req, res) => { //Listo
    try {
        var latitud = req.params.latitud;
        var longitud = req.params.longitud;

        let response = await pool.query('SELECT * FROM stations WHERE latitud=$1 AND longitud=$2',[latitud,longitud]);
        var id_station = response.rows[0].id;
        var date = new Date();
        var month = date.getMonth();
        var day = date.getDate();
        var suma = 0;
        var cont = 0;
        if(id_station != null){
            if(req.params.indicador == "precipitacion"){
                let response = await pool.query('SELECT * FROM precipitacion WHERE EXTRACT(MONTH FROM fecha) = $1 and EXTRACT(DAY FROM fecha) = $2 and id_station = $3 ORDER BY fecha DESC;',[month,day,id_station]);
                response.rows.forEach(element => {
                    if(element.milimetros != null && isNaN(element.milimetros) != true){
                        suma = suma + element.milimetros;
                        cont++;
                    }
                });
                var total = suma/cont;
                res.status(200).json({"valor":total, "fecha":date, "unidad": "mm", "indicador": req.params.indicador});
            }else if(req.params.indicador == "tmax"){
                let response = await pool.query('SELECT * FROM tmax WHERE EXTRACT(MONTH FROM fecha) = $1 and EXTRACT(DAY FROM fecha) = $2 and id_station = $3 ORDER BY fecha DESC;',[month,day,id_station]);
                response.rows.forEach(element => {
                    if(element.temperatura != null && isNaN(element.temperatura) != true){
                        suma = suma + element.temperatura;
                        cont++;
                    }
                });
                var total = suma/cont;
                res.status(200).json({"valor":total, "fecha":date, "unidad": "°C", "indicador": req.params.indicador});
                
            }else if(req.params.indicador == "tmin"){
                let response = await pool.query('SELECT * FROM tmin WHERE EXTRACT(MONTH FROM fecha) = $1 and EXTRACT(DAY FROM fecha) = $2 and id_station = $3 ORDER BY fecha DESC;',[month,day,id_station]);
                response.rows.forEach(element => {
                    if(element.temperatura != null && isNaN(element.temperatura) != true){
                        suma = suma + element.temperatura;
                        cont++;
                    }
                });
                var total = suma/cont;
                res.status(200).json({"valor":total, "fecha":date, "unidad": "°C", "indicador": req.params.indicador});
            }else{
                res.status(404).json({
                    fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
                    mensaje: 'No encontrado'
                });
            }
        }else{
            res.status(404).json({
                fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
                mensaje:"Estación no encontrada."
            });
        }
        
    } catch (error) {
        res.status(412).json({
            fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
            mensaje: error
        });
    }
    

}
const populateDb = async (req,res) => { //Listo
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
    populateDb,
    createUser,
    daily
}