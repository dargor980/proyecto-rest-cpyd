CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    usuario VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    token VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS stations(
    id SERIAL PRIMARY KEY,
    nombre VARCHAR NOT NULL UNIQUE,
    latitud VARCHAR,
    longitud VARCHAR,
    altura FLOAT
);

CREATE TABLE IF NOT EXISTS precipitacion(
    id SERIAL PRIMARY KEY,
    milimetros FLOAT NOT NULL,
    mes VARCHAR NOT NULL,
    dia VARCHAR NOT NULL,
    anio VARCHAR NOT NULL,
    id_station INT,
    CONSTRAINT fk_station
        FOREIGN KEY(id_station)
            REFERENCES stations(id)
);

CREATE TABLE IF NOT EXISTS tmax(
    id SERIAL PRIMARY KEY,
    temperatura FLOAT NOT NULL,
    mes VARCHAR NOT NULL,
    dia VARCHAR NOT NULL,
    anio VARCHAR NOT NULL,
    id_station INT,
    CONSTRAINT fk_station
        FOREIGN KEY(id_station)
            REFERENCES stations(id)
);

CREATE TABLE IF NOT EXISTS tmin(
    id SERIAL PRIMARY KEY,
    temperatura FLOAT NOT NULL,
    mes VARCHAR NOT NULL,
    dia VARCHAR NOT NULL,
    anio VARCHAR NOT NULL,
    id_station INT,
    CONSTRAINT fk_station
        FOREIGN KEY(id_station)
            REFERENCES stations(id)
);
