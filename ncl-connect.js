
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

        var cookie;

        response.headers["set-cookie"].forEach(function(c) {
                if(c.indexOf("shibsession") !== -1)
                    cookie = c;
        });

        request.get({ url: url, jar: jar }, function (error, response, body) {

            if(error)
                return callback(error || { error: 401 }, null);

            var $ = cheerio.load(body);

            callback(null, cookie, $);
        });
    }
}

exports.getPage = function(user, url, callback)
{
    if(user.dev) {
        var fs = require('fs');
        var filename = url.split('?')[0].substring(23).replace(/\//g, '-');
        var file = fs.readFileSync('testHTML/' + filename, 'utf8');
        var $ = cheerio.load(file);
        callback(null, $);
    }
    else {
        if(!user.cookie)
            callback({error: 401}, null);
        else {
            var headers = {
                'Cookie': user.cookie
            };
            request.get({
              url: url,
              headers: headers
            }, function (error, response, body)
            {
                if (!error && response.statusCode == 200)
                {
                    var $ = cheerio.load(body);

                    callback(null, $);
                }
                else
                {
                    callback(error || { error: 401 }, null);
                }
            });
        }
    }
}


