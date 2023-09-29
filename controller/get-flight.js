const express = require('express');
const cache = require('memory-cache');
const axios = require('axios');
const { KJUR } = require('jsrsasign');

const apiUrl = "https://api.vinajet.vn/search-flight";
const airlines = ["VJ", "VN", "VU", "QH"];

function CryptHS512(agCode, serverTime) {
    var oHeader = { 'alg': "HS512", "typ": "JWT" };
    var sHeader = JSON.stringify(oHeader);
    var tEnd = KJUR.jws.IntDate.get('now + 1day');
    var oValue = { 'AgCode': agCode, "exp": tEnd, 'RequestDate': serverTime };
    var sPayload = JSON.stringify(oValue);
    var secretkey = 'VINAJET@' + agCode + '@2020';
    var sJWS = KJUR.jws.JWS.sign("HS512", sHeader, sPayload, secretkey);
    return sJWS;
}

const getCode = async () => {
    try {
        const response = await axios.get('https://api.vinajet.vn/get-self-info');
        const serverTime = response.data.time;
        const authorizationCode = 'VNJ ' + CryptHS512('VINAJET145', serverTime) + ' VINAJET145';
        return authorizationCode
    } catch (error) {
        return null
    }
}

const flattenDomesticDatas = (response) => {
    const returnLocation = (code) => {
        if (code) {
            const cityName = dataCountry.find((element) => element.code === code)?.city;
            return {
                airportId: code,
                cityId: code,
                cityName: cityName,
                name: cityName,
                tag: "",
            };
        }
    };

    if (response.listFareData && Array.isArray(response.listFareData)) {
        const updatedListFareData = response.listFareData.map((item) => ({
            ...item,
            session: response.session,
            from: returnLocation(item.listFlight[0].startPoint),
            to: returnLocation(item.listFlight[0].endPoint),
        }));
        return updatedListFareData;
    }
    return [];
};

exports.getFlight = async (req, res) => {
    try {

        const {
            adults,
            children,
            inf,
            startPoint,
            endPoint,
            departDate,
        } = req.body

        const AuthorizationCode = await getCode();

        const fetchFlightData = async (ListFlight) => {
            const data = {
                AccCode: "VINAJET145",
                AgCode: "VINAJET145",
                UserLogin: "",
                IsTest: false,
                Adt: adults,
                Chd: children,
                Inf: inf,
                IsCompo: false,
                ListFlight: ListFlight,
                ViewMode: "",
                HeaderUser: "",
                HeaderPass: "",
                ProductKey: "",
                LanguageCode: "",
                AgentAccount: "",
                AgentPassword: "",
                Url: ""
            }
            return (await axios.post(apiUrl, data, {
                headers: {
                    Authorization: AuthorizationCode,
                },
            })).data;
        };

        let tripData = []

        tripData = await Promise.all(airlines.map((airline) => fetchFlightData([
            {
                StartPoint: startPoint,
                EndPoint: endPoint,
                DepartDate: departDate,
                Airline: airline
            }
        ])));

        res.status(201).json(tripData);

    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu.' });
    }
}

exports.getFlightReturn = async (req, res) => {
    try {

        const {
            adults,
            children,
            inf,
            startPoint,
            endPoint,
            returnDate,
            twoWay,
        } = req.body

        const AuthorizationCode = await getCode();

        const fetchFlightData = async (ListFlight) => {
            const data = {
                AccCode: "VINAJET145",
                AgCode: "VINAJET145",
                UserLogin: "",
                IsTest: false,
                Adt: adults,
                Chd: children,
                Inf: inf,
                IsCompo: false,
                ListFlight: ListFlight,
                ViewMode: "",
                HeaderUser: "",
                HeaderPass: "",
                ProductKey: "",
                LanguageCode: "",
                AgentAccount: "",
                AgentPassword: "",
                Url: ""
            }
            return (await axios.post(apiUrl, data, {
                headers: {
                    Authorization: AuthorizationCode,
                },
            })).data;
        };

        let returnTripData = []

        if (twoWay === true) {
            returnTripData = await Promise.all(airlines.map((airline) => fetchFlightData([
                {
                    StartPoint: endPoint,
                    EndPoint: startPoint,
                    DepartDate: returnDate,
                    Airline: airline
                }
            ])));

        }else{
            returnTripData = []
        }

        res.status(201).json(returnTripData);

    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy dữ liệu.' });
    }
}