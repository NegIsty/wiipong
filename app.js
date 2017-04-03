var http    = require('http');
var ws      = require('ws');
var express = require('express');
var twig    = require('twig');
var bodyP   = require('body-parser');
var cookieP = require('cookie-parser');
var mysql   = require('mysql');
var md5     = require('md5');
var session = require('express-session');
var app     = express();

// Configuration session
var sess_storage = session({ 
    secret: "projet aws",
    resave: false,
    saveUninitialized: false,
});

// Configuration application
app
    .use(bodyP.urlencoded({ extended: false }))
    .use(cookieP())
    .use(express.static('.'))
    .use(sess_storage)
    .set('views', 'templates')
    .set('twig options', { autoescape: true });

// Configuration MySql
/*var db     = mysql.createConnection({
  host     : process.env.IP,
  user     : process.env.C9_USER.substr(0,16),
  password : '',
  database : 'c9'
});*/
var db     = mysql.createConnection({
  host     : 'mysql-negorigin.alwaysdata.net',
  user     : 'negorigin_wiipon',
  password : 'negorigin_wiipon',
  database : 'negorigin_wiipong'
});

// Liste des utilisateurs connectés
var connectes = {};
var connectesWS = {};

// Date serveur
var date = new Date();

// Gestion accueil
app.get('/', function(req, res) {
    // Si login est défini, rendu d'userlist.twig avec les données des connectés
    if (req.session.login)
        res.render('game.twig');
    // Sinon, redirection sur /signin
    else
        res.redirect('/signin');
});

// Gestion connexion
app.all('/signin', function(req, res) {
    // Si session non définie, traitement de la connexion
    if (!req.session.login) {
        // Si accès par la méthode GET, rendu de signin.twig
        if (req.method == 'GET')
            res.render('signin.twig', { 'err': false });
        // Sinon, gestion de la connexion
        else {
            // Expression régulière pour le login
            var login = new RegExp('^[A-Za-z0-9]+[A-Za-z0-9 ]*[A-Za-z0-9]*$','g');
            // Si le login répond à l'expression régulière, suite de la gestion de la connexion
            if (login.test(req.body.login))
                db.query('SELECT login FROM users WHERE login = ? AND pass = ?', [req.body.login, md5('projet'+req.body.pass+'aws')], function(err, rows) {
                    // Si les identifiants sont corrects, suite de la gestion de la connexion
                    if (!err && rows[0]) {
                        date = new Date();
                        console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Connexion du compte '+rows[0].login);
                        // Stockage des informations de session
                        req.session.login = rows[0].login;
                        // Redirection vers /
                        res.redirect('/');
                    }
                    // Sinon, rendu de signin.twig avec un message d'erreur
                    else
                        res.render('signin.twig', { 'err': true });
                });
            // Sinon, rendu de signin.twig avec un message d'erreur
            else
                res.render('signin.twig', { 'err': true });
        }
    }
    // Sinon, redirection sur /
    else
        res.redirect('/');
});

// Gestion inscription
app.all('/signup', function(req, res) {
    // Si session non définie, traitement de l'inscription
    if (!req.session.login) {
        // Si accès par la méthode GET, rendu de signup.twig
        if (req.method == 'GET')
            res.render('signup.twig', { 'err': false });
        // Sinon, gestion de l'enregistrement
        else {
            // Expression régulière pour le login
            var login = new RegExp('^[A-Za-z0-9]+[A-Za-z0-9 ]*[A-Za-z0-9]*$','g');
            // Expression régulière pour la couleur
            var couleur = new RegExp('^#[0-9a-fA-F]{6}$','g');
            // Si le login et la couleur répondent à leur expression régulière respective et que le mot de passe et la confirmation correspondent, enregistrement du nouvel utilisateur
            if (login.test(req.body.login) && req.body.login != 'null' && couleur.test(req.body.couleur) && req.body.pass != '' && req.body.pass == req.body.confirm)
                db.query('INSERT INTO users VALUES (?, ?, ?, 0, 0)', [req.body.login, md5('projet'+req.body.pass+'aws'), req.body.couleur], function(err, result) {
                    // S'il n'y a pas d'erreur, redirection vers /
                    if (!err) {
                        date = new Date();
                        console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Création du compte '+req.body.login);
                        res.redirect('/signin');
                    }
                    // Sinon, rendu de signup.twig avec un message d'erreur
                    else
                        res.render('signup.twig', { 'err': true });
                });
            // Sinon, rendu de signup.twig avec un message d'erreur
            else
                res.render('signup.twig', { 'err': true });
        }
    }
    // Sinon, redirection sur /
    else
        res.redirect('/');
});

// Gestion 404
app.use(function(req, res, next){
    // Définition du code d'erreur
    res.status(404);
    // Rendu de 404.twig
    res.render('404.twig', { 'url': req.hostname+req.url });
});


// Attachement du serveur Web Socket au même serveur qu'Express
var server = http.createServer(app);
var wsserver = new ws.Server({ 
    server: server,
    // Import de la session dans le serveur WS
    verifyClient: function(info, callback) {
        sess_storage(info.req, {}, function() {
            callback(info.req.session.login, 403, "Unauthorized");
        });
    }
});

// Définition de la logique de la partie Web Socket
wsserver.on('connection', function(wsconn) {
    var login = wsconn.upgradeReq.session.login;
    var date = new Date();
    console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Ouverture connexion WS par '+login);
    
    // Fonction de broadwast de mise à jour de la liste des connectés
    function broadcast() {
      for (var user in connectesWS) {
        try {
            connectesWS[user].ws.send(JSON.stringify({action: 'maj', connectes: connectes, login: user}));
        } catch (e) {}
      }
    }
    
    // Ajout de l'utilisateur à la liste des connectés s'il n'y est pas déjà
    if (!(login in connectes))
        db.query('SELECT parties, gagnees, couleur FROM users WHERE login = ?', [login], function(err, rows) {
            if (!err && rows[0]) {
                connectes[login] = { time: new Date(), statut: 'LIBRE', adversaire: null, parties: rows[0].parties, gagnees: rows[0].gagnees, couleur: rows[0].couleur };
                connectesWS[login] = { ws: wsconn };
                // Broadcast de la mise à jour des connectés
                broadcast();
            }
        });
    
    /// GESTION DE LA PARTIE ///
    
    var raquette1, raquette2, balleH, balleV, vitesseH, vitesseV, score1, score2, roundballmove;
    
    // Initialisation de la position et des vitesses de la balle
    function initround(joueur) {
        balleH = 390;
        balleV = 290;
        vitesseH = (joueur == 1) ? -5 : 5;
        vitesseV = (Math.random() * 5) - 2;
    }
    
    // Gestion de l'affichage des scores
    function majscores() {
        try {
            connectesWS[connectes[login].adversaire].ws.send(JSON.stringify({action: 'majscore', score1: score1, score2: score2}));
            connectesWS[login].ws.send(JSON.stringify({action: 'majscore', score1: score1, score2: score2}));
        }
        catch (e) {}
    }
    
    // Gestion de la fin de la partie
    function endgame(joueur1, joueur2) {
        date = new Date();
        console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Fin de la partie entre '+connectes[login].adversaire+' et '+login+', victoire de '+joueur1);
        
        connectes[joueur1].parties++;
        connectes[joueur1].gagnees++;
        connectes[joueur2].parties++;
        
        // Mise à jour de la base de données
        db.query('UPDATE users SET parties = ?, gagnees = ? WHERE login = ?', [connectes[joueur1].parties, connectes[joueur1].gagnees, joueur1], function(err, result) {
            if (!err)
                db.query('UPDATE users SET parties = ? WHERE login = ?', [connectes[joueur2].parties, joueur2], function(err, result) {
                    if (!err)
                        // Broadcast de la mise à jour des connectés
                        broadcast();
                });
        });
        // Libération des joueurs
        try {
            connectesWS[joueur2].ws.send(JSON.stringify({action: 'defaite'}));
            connectesWS[joueur1].ws.send(JSON.stringify({action: 'victoire'}));
        }
        catch (e) {}
        setTimeout(function() {
            try {
                connectes[joueur2].statut = 'LIBRE';
                connectes[joueur1].statut = 'LIBRE';
                connectesWS[joueur2].ws.send(JSON.stringify({action: 'nojouer'}));
                connectesWS[joueur1].ws.send(JSON.stringify({action: 'nojouer'}));
                connectes[joueur2].adversaire = null;
                connectes[joueur1].adversaire = null;
            }
            catch (e) {}
        }, 5000);
    }
    
    // Gestion de la partie
    function game() {
        var adversaire = connectes[login].adversaire;
        date = new Date();
        console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Lancement de la partie entre '+adversaire+' et '+login);
        // Initialisation de début de partie
        raquette1 = 250;
        raquette2 = 250;
        score1 = 0;
        score2 = 0;
        majscores();
        initround(Math.floor((Math.random()) + 1));
        // Lancement de la première balle
        setTimeout(function() {
            roundballmove = setInterval(ballmove, 15);
        }, 500);
        
        // Gestion des mouvements de la balle
        function ballmove() {
            // Gestion de la désertion
            if (!connectes[login] || !connectes[adversaire]) {
                clearInterval(roundballmove);
                date = new Date();
                console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Abandon de la partie entre '+adversaire+' et '+login);
            }
            // Mise à jour de la position de la balle
            balleH += vitesseH;
            balleV += vitesseV;
            // Gestion de la collision avec la raquette gauche
            if (balleH <= 20 && balleV+20 > raquette1 && balleV < raquette1+100) {
                vitesseH = -vitesseH * 1.05;
                vitesseV = -((raquette1+50)-(balleV+10))/15;
            }
            // Gestion de la collision avec la raquette droite
            if (balleH >= 760 && balleV+20 > raquette2 && balleV < raquette2+100) {
                vitesseH = -vitesseH * 1.05;
                vitesseV = -((raquette2+50)-(balleV+10))/15;
            }
            // Gestion de la collision avec les murs
            if (balleV <= 0 || balleV >= 580)
                vitesseV = -vitesseV;
            // Gestion point marqué gauche
            if (balleH <= 0) {
                clearInterval(roundballmove);
                score2++;
                majscores();
                // Si la partie n'est pas terminée, on relance la balle
                if (score2 < 11) {
                    initround(2);
                    setTimeout(function() {
                        roundballmove = setInterval(ballmove, 15);
                    }, 500);
                }
                // Sinon on traite la fin de partie
                else {
                    try {
                        endgame(login, adversaire);
                    }
                    catch (e) {}
                }
            }
            // Gestion point marqué droite
            if (balleH >= 780) {
                clearInterval(roundballmove);
                score1++;
                majscores();
                // Si la partie n'est pas terminée, on relance la balle
                if (score1 < 11) {
                    initround(1);
                    setTimeout(function() {
                        roundballmove = setInterval(ballmove, 15);
                    }, 500);
                }
                // Sinon on traite la fin de partie
                else
                    endgame(adversaire, login);
            }
            // Envoie de la nouvelle position de la balle
            try {
                connectesWS[adversaire].ws.send(JSON.stringify({action: 'balle', balleH: balleH, balleV: balleV}));
                connectesWS[login].ws.send(JSON.stringify({action: 'balle', balleH: balleH, balleV: balleV}));
            }
            catch (e) {}
        }
    }
    
    /// FIN GESTION DE LA PARTIE ///
    
    wsconn.on('message', function(data) {
        var content = JSON.parse(data);
        
        // Gestion des invitations
        if (content.action == 'duel') {
            try {
                // Annulation d'inviation
                if (connectes[login].statut == 'EN ATTENTE' && connectes[login].adversaire == content.adversaire) {
                    date = new Date();
                    console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Annulation de l\'invitation de '+login+' à '+content.adversaire);
                    connectes[connectes[login].adversaire].statut = 'LIBRE';
                    connectes[connectes[login].adversaire].adversaire = null;
                    connectes[login].statut = 'LIBRE';
                    connectes[login].adversaire = null;
                    connectesWS[content.adversaire].ws.send(JSON.stringify({action: 'advduel', adversaire: null}));
                    wsconn.send(JSON.stringify({action: 'advduel', adversaire: null}));
                    connectesWS[content.adversaire].ws.send(JSON.stringify({action: 'alert', message: 'L\'invitation a été annulée'}));
                }
                // Gestion des cas de non lancement de partie
                else if (login == content.adversaire)
                    wsconn.send(JSON.stringify({action: 'alert', message: 'Vous ne pouvez pas vous défier vous même'}));
                else if (connectes[login].statut != 'LIBRE')
                    wsconn.send(JSON.stringify({action: 'alert', message: 'Vous n\'êtes pas libre'}));
                else if (connectes[content.adversaire].statut != 'LIBRE')
                    wsconn.send(JSON.stringify({action: 'alert', message: content.adversaire+' n\'est pas libre'}));
                // Si les deux joueurs sont libres, mise à jour de leur statut et adversaire, et envoi de la demande
                else {
                    date = new Date();
                    console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Invitation de '+login+' à '+content.adversaire);
                    connectesWS[content.adversaire].ws.send(JSON.stringify({action: 'advduel', adversaire: login}));
                    wsconn.send(JSON.stringify({action: 'advduel', adversaire: content.adversaire}));
                    connectes[content.adversaire].statut = 'INVITE';
                    connectes[login].statut = 'EN ATTENTE';
                    connectes[content.adversaire].adversaire = login;
                    connectes[login].adversaire = content.adversaire;
                    connectesWS[content.adversaire].ws.send(JSON.stringify({action: 'demande', adversaire: login}));
                }
            }
            catch (e) {}
        }
        
        // Gestion de l'acceptation de l'invitation
        else if (content.action == 'accept') {
            try {
                if (connectes[login].statut != 'EN JEU' && connectes[content.adversaire].statut != 'EN JEU' && connectes[login].adversaire == content.adversaire) {
                    date = new Date();
                    console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Acceptation de l\'invitation de '+content.adversaire+' à '+login);
                    // Mise à jour du statut des joueurs
                    connectes[connectes[login].adversaire].statut = 'EN JEU';
                    connectes[login].statut = 'EN JEU';
                    // Envoi aux joueurs les informations pour afficher la partie
                    connectesWS[connectes[login].adversaire].ws.send(JSON.stringify({action: 'jouer', user: connectes[connectes[login].adversaire], user2: connectes[login]}));
                    connectesWS[login].ws.send(JSON.stringify({action: 'jouer', user1: connectes[connectes[login].adversaire], user: connectes[login]}));
                    // Lancement de la partie
                    game();
                }
            }
            catch (e) {}
        }
        
        // Libération des joueurs si rejet de l'invitation
        else if (content.action == 'reject') {
            try {
                if (connectes[login].statut != 'EN JEU' && connectes[content.adversaire].statut != 'EN JEU' && connectes[login].adversaire == content.adversaire) {
                    date = new Date();
                    console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Refus de l\'invitation de '+content.adversaire+' à '+login);
                    connectes[connectes[login].adversaire].statut = 'LIBRE';
                    connectes[login].statut = 'LIBRE';
                    connectesWS[connectes[login].adversaire].ws.send(JSON.stringify({action: 'advduel', adversaire: null}));
                    wsconn.send(JSON.stringify({action: 'advduel', adversaire: null}));
                    connectes[connectes[login].adversaire].adversaire = null;
                    connectes[login].adversaire = null;
                }
            }
            catch (e) {}
        }
        
        // Envoi de la position de la raquette d'un joueur à l'adversaire et mise à jour de la position de la raquette droite
        else if (content.action == 'move') {
            try {
                connectesWS[connectes[login].adversaire].ws.send(JSON.stringify({action: 'advmove', user: content.user, position: content.position}));
                raquette2 = content.position;
            }
            catch (e) {}
        }
        
        // Mise à jour de la position de la raquette gauche
        else if (content.action == 'repmove') {
            raquette1 = content.position;
        }
        
        // Suppression de la session pour déconnecter l'utilisateur
        else if (content.action == 'logout') {
            date = new Date();
            console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Déconnexion du compte '+login);
            wsconn.upgradeReq.session.destroy();
        }
        
        // Gestion de la demande de suppression du compte de l'utilisateur
        else if (content.action == 'askdelete') {
            try {
                connectesWS[login].ws.send(JSON.stringify({action: 'confirmdelete', message: 'Saisissez votre mot de passe pour supprimer le compte '+login+' :'}));
            }
            catch (e) {}
        }
        
        // Gestion de la demande de suppression du compte de l'utilisateur
        else if (content.action == 'delete') {
            try {
                // Vérification que le mot de passe saisie est le bon
                db.query('SELECT pass FROM users WHERE login = ?', [login], function(err, rows) {
                    if (!err && rows[0] && rows[0].pass == md5('projet'+content.pass+'aws')){
                        // Si oui, suppression du compte
                        db.query('DELETE FROM users WHERE login = ?', [login], function(err, rows) {
                            if (!err) {
                                date = new Date();
                                console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Suppression du compte '+login);
                                //Suppression de la session
                                wsconn.upgradeReq.session.destroy();
                                try {
                                    connectesWS[login].ws.send(JSON.stringify({action: 'finducompte'}));
                                }
                                catch (e) {}
                                wsconn.close();
                            }
                            else {
                                try {
                                    setTimeout(function() {connectesWS[login].ws.send(JSON.stringify({action: 'confirmdelete', message: 'Erreur, saisissez à nouveau votre mot de passe pour supprimer le compte '+login+' :'}))}, 100);
                                }
                                catch (e) {}
                            }
                        });}
                    else {
                        try {
                            setTimeout(function() {connectesWS[login].ws.send(JSON.stringify({action: 'confirmdelete', message: 'Mot de passe incorrect, saisissez votre mot de passe pour supprimer le compte '+login+' :'}))}, 100);
                        }
                        catch (e) {}
                    }
                });
            }
            catch (e) {}
        }
    });
    
    // Gestion de la fermeture de la connexion
    wsconn.on('close', function() {
        date = new Date();
        console.log('['+date.getFullYear()+'-'+('0'+(date.getMonth()+1)).slice(-2)+'-'+('0'+date.getDate()).slice(-2)+' '+('0'+date.getHours()).slice(-2)+':'+('0'+date.getMinutes()).slice(-2)+':'+('0'+date.getSeconds()).slice(-2)+'] Fermeture connexion WS par '+login);
        try {
            // Libération de l'éventuel adversaire en cours
            if (connectes[login].adversaire) {
                connectes[connectes[login].adversaire].statut = 'LIBRE';
                connectes[connectes[login].adversaire].adversaire = null;
                connectesWS[connectes[login].adversaire].ws.send(JSON.stringify({action: 'nojouer'}));
            }
            // Suppression de l'utilisateur de la liste des connectés
            delete connectes[login];
            delete connectesWS[login];
            // Broadcast de la mise à jour des connectés
            broadcast();
        }
        catch (e) {}
    });
});

// Lancement de l'application
server.listen(process.env.PORT);