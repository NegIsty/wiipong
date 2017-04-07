var table = document.querySelector('#table-joueurs tbody');
var logout = document.querySelector('#logout');
var suppr = document.querySelector('#delete');
var masque = document.querySelector('#masque');
var raquette1 = document.querySelector('#raquette1');
var raquette2 = document.querySelector('#raquette2');
var raquetteInt1 = document.querySelector('#raquetteInt1');
var raquetteInt2 = document.querySelector('#raquetteInt2');
var balle = document.querySelector('#balle');
var score1 = document.querySelector('#score1');
var score2 = document.querySelector('#score2');
var victoire = document.querySelector('#victoire');

// Fonction de gestion des mouvements de clavier
function keyboardMove(e, raquette, joueur) {
    if ((e.keyCode == 38 || e.keyCode == 90 || e.keyCode == 87) && raquette.offsetTop > 0)
        raquette.style.marginTop = raquette.offsetTop-25+'px';
    else if ((e.keyCode == 40 || e.keyCode == 83) && raquette.offsetTop < 500)
        raquette.style.marginTop = raquette.offsetTop+25+'px';
    // Envoi du mouvement
    ws.send(JSON.stringify({
        action: 'move',
        user: joueur,
        position: raquette.style.marginTop ? parseInt(raquette.style.marginTop, 10) : 250
    }));
}

// Fonction de gestion des mouvements de téléphone et tablette
function phoneMove(e, raquette, joueur) {
    if (e.accelerationIncludingGravity.y < 0 && raquette.offsetTop > 0)
        raquette.offsetTop+e.accelerationIncludingGravity.y*10 >= 0 ? raquette.style.marginTop = raquette.offsetTop+e.accelerationIncludingGravity.y*5+'px' : raquette.style.marginTop = 0+'px';
    else if (e.accelerationIncludingGravity.y > 0 && raquette.offsetTop < 500)
        raquette.offsetTop+e.accelerationIncludingGravity.y*10 <= 500 ? raquette.style.marginTop = raquette.offsetTop+e.accelerationIncludingGravity.y*5+'px' : raquette.style.marginTop = 500+'px';
    // Envoi du mouvement
    ws.send(JSON.stringify({
        action: 'move',
        user: joueur,
        position: raquette.style.marginTop ? parseInt(raquette.style.marginTop, 10) : 250
    }));
}

var ws = new WebSocket((window.location.protocol == 'https:' ? 'wss://' : 'ws://') + window.location.host);

// Définition de la logique de la partie Web Socket
ws.addEventListener('open', function(e) {
    ws.addEventListener('message', function(e) {
        var content = JSON.parse(e.data);
        
        // Gestion de l'affichage de la liste des utilisateurs
        if (content.action == 'maj') {
            var users = content.connectes;
            // Suppression de l'ancienne table
            table.textContent = '';
            // Création d'une nouvelle ligne à la table pour chaque connecté
            for (var i in users) {
                var ligne = document.createElement('tr');
                var colonne = document.createElement('td');
                colonne.textContent = i;
                ligne.appendChild(colonne);
                colonne = document.createElement('td');
                colonne.textContent = users[i].parties;
                ligne.appendChild(colonne);
                colonne = document.createElement('td');
                colonne.textContent = users[i].gagnees;
                ligne.appendChild(colonne);
                colonne = document.createElement('td');
                var couleur = document.createElement('div');
                couleur.setAttribute('class', 'couleur');
                couleur.style.backgroundColor = users[i].couleur;
                colonne.appendChild(couleur);
                ligne.appendChild(colonne);
                colonne = document.createElement('td');
                var duel = document.createElement('div');
                duel.setAttribute('class', 'duel');
                duel.setAttribute('id', 'duel_'+i);
                var image = document.createElement('img');
                if (users[i].adversaire != content.login)
                    image.setAttribute('src', 'images/duel.png');
                else
                    image.setAttribute('src', 'images/duelactif.png');
                image.setAttribute('alt', 'Défier');
                image.setAttribute('id', 'imgduel_'+i.replace(" ", "_"));
                duel.appendChild(image);
                colonne.appendChild(duel);
                ligne.appendChild(colonne);
                table.appendChild(ligne);
                // Création pour chaque élément duel d'une réaction au clic qui lance une invitation
                duel.addEventListener('click', function(e) {
                    ws.send(JSON.stringify({
                        action: 'duel',
                        adversaire: this.getAttribute('id').substring(5)
                    }));
                });
            }
        }
        
        // Gestion de la suppression de compte
        else if (content.action == 'confirmdelete') {
            // Affiche la demande de confirmation sous forme d'alerte
            //var pass = prompt(content.message)
            swal({
                title: "Suppression",
                text: content.message,
                type: "input",
                inputType: "password",
                showCancelButton: true,
                confirmButtonColor: "#DD6B55",
                inputPlaceholder: "Mot de passe"
            }, function(inputValue){
                if (inputValue || inputValue === '')
                    ws.send(JSON.stringify({
                        action: 'delete',
                        pass: inputValue
                    }));
            });
            
            // Envoi de la confirmation si OK
            /*if (pass)
                ws.send(JSON.stringify({
                    action: 'delete',
                    pass: pass
                }));*/
        }
        
        // Gestion de la redirection post suppression de compte
        else if (content.action == 'finducompte') {
            window.location = '/signin';
        }
        
        // Gestion de l'affichage de l'icone duel de l'adversaire
        else if (content.action == 'advduel') {
            // Change l'image de duel
            if (content.adversaire)
                document.querySelector('#imgduel_'+content.adversaire.replace(" ", "_")).setAttribute('src', 'images/duelactif.png');
            else
                document.querySelector('[src="images/duelactif.png"]').setAttribute('src', 'images/duel.png');
        }
        
        // Gestion des alertes
        else if (content.action == 'alert') {
            // Affiche le message sous forme d'alerte
            //alert(content.message);
            swal("Erreur", content.message, "error");
        }
        
        // Gestion des invitations
        else if (content.action == 'demande') {
            // Affiche la demande de confirmation sous forme d'alerte
            //var accept = confirm(content.adversaire+' vous défie');
            swal({
                title: "Duel",
                text: content.adversaire+" vous défie !",
                type: "warning",
                showCancelButton: true,
                cancelButtonText: "Pas maintenant...",
                confirmButtonColor: "#478BF9",
                confirmButtonText: "Go !"
            }, function(isConfirm){
                if (isConfirm) {
                    ws.send(JSON.stringify({
                        action: 'accept',
                        adversaire: content.adversaire
                    }));
                } else {
                    ws.send(JSON.stringify({
                        action: 'reject',
                        adversaire: content.adversaire
                    }));
                }
            });
            // Envoi de la réponse
            /*ws.send(JSON.stringify({
                action: accept ? 'accept' : 'reject',
                adversaire: content.adversaire
            }));*/
        }
        
        // Gestion du jeu
        else if (content.action == 'jouer') {
            // Affichage du terrain
            masque.setAttribute('style', 'visibility: visible');
            
            // Gestion du terrain pour le joueur 2 (gauche)
            if (content.user1) {
                // Affichage des couleurs des joueurs sur les raquettes
                raquetteInt1.setAttribute('style', 'background-color: '+content.user1.couleur);
                raquetteInt2.setAttribute('style', 'background-color: '+content.user.couleur);
                
                // Gestion des déplacements sur PC
                window.addEventListener("keydown",  function(e) {
                    keyboardMove(e, raquette2, 2);
                });
                
                // Gestion des déplacements sur téléphone et tablette
                window.addEventListener("devicemotion", function(e) {
                    phoneMove(e, raquette2, 2);
                });
            }
            
            // Gestion du terrain pour le joueur 1 (droite)
            else if (content.user2) {
                // Affichage des couleurs des joueurs sur les raquettes
                raquetteInt1.setAttribute('style', 'background-color: '+content.user.couleur);
                raquetteInt2.setAttribute('style', 'background-color: '+content.user2.couleur);
                
                // Gestion des déplacements sur PC
                window.addEventListener("keydown",  function(e) {
                    keyboardMove(e, raquette1, 1);
                });
                
                // Gestion des déplacements sur téléphone et tablette
                window.addEventListener("devicemotion", function(e) {
                    phoneMove(e, raquette1, 1);
                });
            }
        }
        
        // Gestion du mouvement de l'adversaire
        else if (content.action == 'advmove') {
            // Si mouvement de joueur 1, mise à jour de la position de sa raquette et transfert au serveur
            if (content.user == 1) {
                raquette1.style.marginTop = content.position+'px';
                ws.send(JSON.stringify({
                    action: 'repmove',
                    position: raquette1.style.marginTop ? parseInt(raquette1.style.marginTop, 10) : 250
                }));
            }
            // Sinon si mouvement de joueur 2, mise à jour de la position de sa raquette
            else if (content.user == 2) {
                raquette2.style.marginTop = content.position+'px';
            }
        }
        
        // Gestion de la balle
        else if (content.action == 'balle') {
            balle.style.marginTop = content.balleV+'px';
            balle.style.marginLeft = content.balleH+'px';
        }
        
        // Gestion des scores affichés sur le terrain
        else if (content.action == 'majscore') {
            score1.textContent = content.score1;
            score2.textContent = content.score2;
        }
        
        // Gestion de la victoire
        else if (content.action == 'victoire') {
            victoire.textContent = 'VICTOIRE !';
        }
        
        // Gestion de la défaite
        else if (content.action == 'defaite') {
            victoire.textContent = 'DÉFAITE...';
        }
        
        // Gestion de l'arrêt du jeu
        else if (content.action == 'nojouer') {
            // Masquage du terrain
            //masque.setAttribute('style', 'visibility: hidden');
            //victoire.textContent = '';
            // Change l'image de duel
            //document.querySelector('[src="images/duelactif.png"]').setAttribute('src', 'images/duel.png');
            // Actualisation ou suppression des eventListeners de mouvements
            window.location.reload();
        }
    });
    
    // Création d'une réaction au clic sur déconnexion
    logout.addEventListener('click', function(e) {
        // Signalement de la déconnexion
        ws.send(JSON.stringify({
            action: 'logout'
        }));
        // Redirection vers la page de connexion
        window.location = '/signin';
    });
    
    // Création d'une réaction au clic sur supprimer mon compte
    suppr.addEventListener('click', function(e) {
        // Signalement de la suppression
        ws.send(JSON.stringify({
            action: 'askdelete'
        }));
    });
    
    // Non Heroku, je ne suis pas absent
    setInterval(function() {
        ws.send(JSON.stringify({
            action: 'coucou'
        }));
    }, 30000);
});