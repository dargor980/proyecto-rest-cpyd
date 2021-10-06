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


const loginClient = async (req, res) => {

}

const getStations = async (req, res) => {
    res.json({
        mensaje: "this"
    })
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