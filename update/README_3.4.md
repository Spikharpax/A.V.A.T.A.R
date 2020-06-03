# Bonjour à tous les geeks ! :-D

***
## ★ Une nouvelle version 3.4 est disponible !

Enfin !! après plusieurs mois, voiçi une nouvelle version du serveur A.V.A.T.A.R !

Cette version corrige principalement une faille de sécurité retournée par GitHub.
L'accès à la bibliothèque de plug-ins se fait maintenant avec un login/token et non plus par le login/password.
N'ayez crainte ! La génération d'un token d'accès se fait très facilement et en 2 minutes :-D
Ouvrez la bibliothèque de plug-in puis l'aide à l'utilisation en haut à droite pour plus de détails.

Quelques fonctionnalités ont aussi été ajoutées:
* Un paramètre "Interface" supplémentaire: Vous pouvez maintenant choisir d'afficher (ou non) le nom des clients dans l'interface
* Un paramètre "Interface" supplémentaire: Vous pouvez maintenant choisir de désactiver par défaut le capteur de pièce courante (en plus du mode manuel) 
	- Attention, cette particularité nécessite de garder le fichier _plugin/generic/generic.js_ ou de le merger avec le vôtre si vous y avez apporté des modifications.
* Le mode "Sans Interface" a été désactivé dans les paramètres (plus géré)
* Fonction _export.unresize(callback)_ dans les plug-in => Permet d'ignorer des classes de nodes à ne pas redimensionner pendant le resizing du DOM
	- Lorsque le plug-in eeDomus sera déposé (très prochainement), vous pourrez avoir un exemple de cette fonction.
* Le module _cytoscape.js_ a été mis à jour à la dernière version.
* Et globalement, de petites corrections du code pour une meilleure stabitilté.

<BR>
Have fun, restez cooooOOOoool !!

<BR>
Logiciel libre sous [licence MIT](https://github.com/Spikharpax/A.V.A.T.A.R/blob/master/LICENSE)

Copyright (c) 2019 A.V.A.T.A.R - Stéphane Bascher
