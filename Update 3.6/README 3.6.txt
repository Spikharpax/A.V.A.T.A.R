************************
Mise à jour version 3.6
************************

Ce patch n'est à installer que si vous avez une version 3.5
Pour une installation complète, le package d'installation Avatar.7z contient déjà ce patch.

Mise à jour:
	- Nouveau module Google-translate-api

Procédure d'installation :
	- Copiez le répertoire google-translate-api dans le répertoire <SERVEUR>/resources/core/node_modules
		- Validez le remplacement des fichiers
		- Vous pouvez aussi supprimer le répertoire <SERVEUR>/resources/core/node_modules/google-translate-token
	- IMPORTANT: Changez la propriété "version" en 3.6 dans le fichier de propriétés <SERVEUR>/resources/core/Avatar.prop
