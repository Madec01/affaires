# Repère — gestion des affaires

Application locale de suivi des affaires, actions, interlocuteurs, références et notes. Version déposée : **1.23**, schéma de données **13**.

## Démarrer

1. Télécharger le dépôt avec **Code → Download ZIP**, puis extraire l’archive.
2. Ouvrir `Repere_Affaires_V1.html` dans un navigateur récent.
3. Utiliser les paramètres de l’application pour importer une sauvegarde JSON existante, si nécessaire.

Le programme tient dans un seul fichier HTML, avec son JavaScript et ses styles intégrés. Il ne nécessite ni installation de dépendances ni compilation. Le fichier à modifier est [Repere_Affaires_V1.html](Repere_Affaires_V1.html).

## Fonctionnalités présentes

- Affaires organisées par tranche et projet TEM / AT, avec préparation, réalisation et finition.
- Actions, échéances, relances et demandes hors affaire.
- Éléments d’affaire, références, entreprises et répertoire de contacts.
- Notes, tableaux, sous-pages, commandes `/` et mentions `@`.
- Synthèses imprimables en PDF et exportables sous forme de brouillon e-mail.
- Modes clair et sombre, navigation compacte et filtres.
- Import et export JSON, copie locale précédente et téléchargements automatiques de sauvegardes.

## Données et sauvegardes

Les données saisies sont stockées dans le navigateur (`localStorage`), séparément du programme. Elles ne sont pas contenues dans ce dépôt et ne sont pas synchronisées par GitHub.

Exporter une sauvegarde JSON avant de changer de navigateur, de profil ou d’emplacement du fichier HTML. Un changement d’emplacement peut donner accès à un autre espace de stockage selon le navigateur ; importer alors la sauvegarde dans l’application.

L’export automatique est réglé par défaut sur 30 minutes après modification. Il fonctionne lorsque l’application reste ouverte et visible, en dehors des formulaires ouverts. Le navigateur peut demander une autorisation ou bloquer un téléchargement : contrôler le fichier reçu et utiliser **Vérifier le fichier…** dans l’application.

Le dépôt est public. Conserver les sauvegardes, documents de travail, données personnelles et identifiants hors du dépôt. Le fichier `.gitignore` exclut plusieurs formats et dossiers courants de sauvegarde ; il ne remplace pas la vérification des fichiers ajoutés.

## Suite prévue

La connexion par compte et la synchronisation entre appareils avec Firebase sont prévues pour une étape ultérieure. Elles ne sont pas intégrées à cette version. Le briefing quotidien assisté par IA est également à étudier.
