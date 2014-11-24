
var request = require('request'),
    cheerio = require('cheerio'),
    FormData = require('form-data');

exports.login = function(url, user, callback)
{
    var jar = request.jar();

    request.get({ uri: url, jar: jar }, function(error, response, body) {

        if(error)
            return callback(error || {error: 401}, null);

        request.post({

            url: 'https://gateway.ncl.ac.uk/idp/Authn/UserPassword',
            jar: jar,
            form: {
                j_username: user.id,
                j_password: user.pass,
                _eventId: 'submit',
                submit: 'LOGIN'
            }

        }, onGatewayResponse);
    });

    function onGatewayResponse(error, response, body)
    {
        if(error)
            return callback(error || { error: 401 }, null);

        request.get({ url: url, jar: jar }, function (error, response, body) {

            if(error)
                callback(error || { error: 401 }, null);
            
            var $ = cheerio.load(body);
            var $form = $('form');
            var action = $form.attr('action');
            var response = $form.find('input[name=SAMLResponse]').attr('value');

            request.post({ url: action, jar: jar, form: { SAMLResponse: response } }, onLoginResponse);
        });
    }

    function onLoginResponse(error, response, body)
    {
        if(error)
            return callback(error || { error: 401 }, null);

        console.log(response);

        var cookie = response.headers["set-cookie"][0];

        request.get({ url: url, jar: jar }, function (error, response, body) {

            if(error)
                return callback(error || { error: 401 }, null);

            var $ = cheerio.load(body);

            var response = {
                name: $('#uname').text().trim().split(' (')[0],
                fullid: $('#uname').text().trim().split(' (')[1].slice(0, -1),
                cookie: cookie
            };

            callback(null, response);
        });
    }
}



