
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
                return callback(error || { error: 401 }, null);
            
            var $ = cheerio.load(body);
            var $form = $('form');
            var action = $form.attr('action');
            var response = $form.find('input[name=SAMLResponse]').attr('value');
            var target = $form.find('input[name=TARGET]');

            request.post({
                url: action,
                jar: jar,
                form: {
                    SAMLResponse: response,
                    TARGET: target.length > 0 ? target.attr('value') : ''
                }
            }, onLoginResponse);
        });
    }

    function onLoginResponse(error, response, body)
    {
        if(error)
            return callback(error || { error: 401 }, null);

        var cookie = response.headers["set-cookie"][0];

        request.get({ url: url, jar: jar }, function (error, response, body) {

            if(error)
                return callback(error || { error: 401 }, null);

            var $ = cheerio.load(body);

            callback(null, cookie, $);
        });
    }
}
