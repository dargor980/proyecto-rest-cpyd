const express = require('express');
const request = require('request-promise');
const cors = require('cors');
const { json } = require('express');
const os = require('os');
const moment = require('moment')
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());

const PORT = process.env.PORT || 3000;


app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Authorization, X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Allow-Request-Method');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Allow', 'GET, POST, OPTIONS, PUT, DELETE', 'OPTIONS', 'HEAD');
    next();
});

app.use(require('./routes/indexRoutes'));

app.listen(PORT, () => {
    let data = getHostInfo();
    console.log(data);
    console.log(`Servidor iniciado en ${PORT}`);
});

app.get("/api", (req, res) => {
    res.json({
        mensaje: "Lala"
    });
});

app.post("/api/login", (req, res) => {
    const user = {
        id: 1,
        nombre: "test",
        email: "example@example.com"
    }
    jwt.sign({ user }, 'secretkey', { expiresIn: '600s' }, (err, token) => {
        res.json({
            token
        });
    });
});

function getHostInfo() {
    let date = moment().format('MMMM Do YYYY, h:mm:ss a');
    let hostInfo = `Fecha: ${date}\nHost: ${os.hostname()}\nSistema Operativo: ${os.type()}\nServidor: NodeJS ${process.version}\n`;
    return hostInfo;
}

