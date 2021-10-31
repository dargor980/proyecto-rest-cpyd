const jwt = require('jsonwebtoken');

function validateToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    console.log(bearerHeader);
    if (typeof bearerHeader != 'undefined') {
        const bearer = bearerHeader.split(" ");
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    } else {
        res.status(403).json({
            fecha: moment().format('MMMM Do YYYY, h:mm:ss a'),
            mensaje: "Unauthorized"
        });
    }
}


module.exports = {
    validateToken,
}