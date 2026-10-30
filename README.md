# Repère — gestion des affaires

**Version 1.27** · schéma des sauvegardes **13**.

Repère suit les affaires, projets TR1/TR2 et TEM/AT, actions, demandes hors affaire, interlocuteurs, éléments, références et notes. Les synthèses restent imprimables en PDF et exportables en brouillon e-mail. Sur téléphone (jusqu’à 700 px), une interface dédiée place la todo liste au premier plan ; la présentation PC reste disponible sur écran large.

## Deux modes

- **Version Web HTTPS** : connexion par e-mail/mot de passe et synchronisation Firebase. Un seul compte personnel est autorisé, utilisable sur plusieurs appareils.
- **Fichier local** : ouvrir directement `Repere_Affaires_V1.html` conserve le fonctionnement local, sans charger Firebase. Exporter un JSON depuis ce mode pour reprendre ses données dans la version Web.

Le fichier HTML reste autonome pour le mode local. La version connectée charge les SDK officiels Firebase Authentication et Firestore (13.1.0) depuis le CDN Google. Elle requiert un accès réseau pour sa première ouverture et la connexion. Aucun mot de passe ni clé de compte de service n’est inclus dans le dépôt.

## Téléphone — version 1.27

- **Aujourd’hui** : actions d’affaires et demandes hors affaire, classées en priorités, relances, échéances du jour, suite et réponses attendues. L’affaire est affichée avant l’action. Les filtres sont regroupés dans un bouton.
- **Toutes** : actions ouvertes, en attente ou terminées ; filtres par affaire, tranche, TEM/AT, urgence et recherche.
- **Affaires** : liste compacte ; ouverture sur les actions du projet sélectionné, puis onglets Dossier / Notes. Références MC, OT, ADR, PDS, FEP et régimes filtrées sur le projet, contacts avec liens Appeler / E-mail, SharePoint et Cockpit. Éléments et documents restent accessibles via ⋯.
- **+** : ajout rapide d’une demande hors affaire, d’une action sur un ou plusieurs projets, ou d’une note à classer. La priorité des demandes conserve les règles existantes. Une durée facultative peut aussi être donnée à une action d’affaire.
- Un appui sur l’action ouvre sa fiche : terminer/rouvrir, en cours, reporter, en attente, ajouter un suivi, modifier. La case permet de terminer directement, avec **Annuler** dans le message de confirmation.
- Zones tactiles, champs de 16 px, formulaires défilants et boutons de validation accessibles ; modes clair et sombre. Les commandes `/` et mentions `@` existantes sont conservées. Le dictaphone du clavier du téléphone peut servir à saisir du texte.

### Installation et hors connexion

Ouvrir l’adresse HTTPS, se connecter avec **Rester connecté**, puis ouvrir **⋯ → Installer sur le téléphone**. Sur Android, utiliser le bouton Installer proposé par le navigateur ; sur iPhone, passer par Safari → Partager → Sur l’écran d’accueil. Vérifier le message « Application disponible hors connexion » avant l’essai en mode avion.

Le service worker ne garde que le code public, le manifeste, les icônes et les trois modules SDK officiels. Il n’intercepte ni les appels Firestore/Authentication ni les documents SharePoint. Les données restent dans IndexedDB ; le protocole de synchronisation et son délai de **3 minutes après la dernière modification** sont conservés. Aucun envoi Firebase supplémentaire n’est déclenché par la navigation mobile, l’installation ou le service worker. Le navigateur peut suspendre l’application lorsqu’elle est fermée : les envois en attente reprennent à la prochaine ouverture, sans garantie d’exécution en arrière-plan.

Une mise à jour installable est signalée par **Nouvelle version disponible**. Elle attend le bouton **Mettre à jour l’application**, qui enregistre d’abord les modifications locales. Les formulaires non validés ne sont pas enregistrés automatiquement. Le fichier HTML ouvert directement reste utilisable sans installation. La première ouverture/connexion, une reconnexion après déconnexion et les données encore absentes de l’appareil demandent Internet. Un nettoyage du stockage du navigateur peut supprimer le cache et les données locales.

### Essai téléphone

1. Actualiser la version sur **les deux appareils**, vérifier **v1.27** dans ⋯.
2. Créer une demande hiérarchique de 3 minutes via **+** : elle doit apparaître en priorité. Ajouter un suivi, terminer puis annuler.
3. Depuis une affaire, créer une action et cocher deux projets : une seule action, visible dans chacun. Filtrer TR1/TR2 et vérifier les couleurs.
4. Ouvrir Dossier, changer la tranche/projet, contrôler les références et les contacts ; ouvrir une note et tester `/` et `@`.
5. Laisser l’application ouverte 3 minutes après la dernière modification et vérifier la réception sur le PC.
6. Après installation/préparation et synchronisation, activer le mode avion, fermer puis rouvrir Repère, cocher une action. Rétablir le réseau et vérifier sa synchronisation.

## Configuration Firebase

Projet : `repere-affaires`. Compte autorisé : `uApWq2k3mHNiCymeLpJRA3E0UwJ2`.

1. Dans **Authentication → Mode de connexion**, activer **Adresse e-mail/Mot de passe**.
2. Vérifier que l’utilisateur créé dans **Authentication → Utilisateurs** possède l’UID indiqué ci-dessus.
3. Créer une base **Firestore Standard**, identifiant **`(default)`**, emplacement **Paris (`europe-west9`)**, initialement en **mode production**.
4. Dans **Firestore → Règles**, copier le contenu intégral de [firestore.rules](firestore.rules), puis **Publier**. Le contrôle dans le programme ne remplace pas ces règles côté serveur.
5. Dans **Authentication → Paramètres → Domaines autorisés**, ajouter **`madec01.github.io`**, sans protocole ni chemin.
6. Rester sur l’offre **Spark** pour les premiers essais. Cette version n’utilise ni Cloud Functions, ni Cloud Storage, ni service IA.

La configuration Web publique est intégrée dans `src/cloud-ui.js`. Le nom `storageBucket` fait partie de la configuration fournie par Firebase, mais aucun fichier n’est envoyé à Cloud Storage. Les documents SharePoint restent dans SharePoint.

Les règles proposées autorisent le propriétaire à accéder à son espace et refusent tous les autres clients. Les administrateurs du projet Firebase gardent leurs pouvoirs d’administration. Un autre compte n’est pas un compte invité : son accès à cet espace est refusé.

Les fichiers `firebase.json` et `firestore.indexes.json` permettent aussi un déploiement avec une CLI Firebase déjà autorisée :

```sh
firebase deploy --only firestore --project repere-affaires
```

L’exclusion d’index du champ texte évite d’indexer les fragments de sauvegarde ; elle n’est pas nécessaire au fonctionnement des lectures par identifiant. Aucun déploiement de règles dans votre projet n’est réalisé par un simple commit GitHub.

## Activer GitHub Pages

Dans le dépôt **Madec01/affaires** :

1. **Settings → Pages**.
2. Sous **Build and deployment**, sélectionner **Deploy from a branch**.
3. Sélectionner **main** et **/(root)**, puis **Save**.
4. Attendre la publication indiquée par GitHub.
5. Ouvrir `https://madec01.github.io/affaires/` ; l’entrée renvoie vers le fichier HTML principal.

Cette adresse sert l’application ; les données privées sont lues depuis Firebase après connexion. Les sauvegardes ne doivent jamais être ajoutées au dépôt, qui est public.

## Première connexion et reprise des données

1. Exporter et conserver le JSON depuis l’ancien fichier local.
2. Ouvrir la version Web et se connecter avec le compte Firebase créé.
3. Commencer par une affaire fictive et vérifier la synchronisation sur un second appareil.
4. Pour reprendre les vraies données : **Réglages → Importer une sauvegarde** ou le menu **⋯ → Importer**. Contrôler les compteurs et confirmer.
5. L’import **remplace tout l’espace connecté**, puis synchronise ce remplacement. Il ne fusionne pas deux sauvegardes.
6. Attendre **Synchronisé** dans la barre du haut avant de vérifier le second appareil.

Si une ancienne version a déjà été utilisée sur la même adresse Web, **Compte et synchronisation → Reprise et copies de sécurité → Reprendre les anciennes données de ce navigateur** propose sa restauration. Le navigateur ne permet pas à la page Web de lire automatiquement le stockage de l’ancien fichier `file://` : dans ce cas, utiliser le JSON.

## IndexedDB et synchronisation économe

**IndexedDB est la base locale**, en mode fichier comme en mode Web. Chaque modification validée dans l’application y est enregistrée immédiatement, sans attendre Firebase ni la fermeture. Les frappes dans les notes sont enregistrées localement ; les formulaires attendent leur validation. Le message « Enregistré dans IndexedDB » apparaît après la fin de la transaction locale. Une panne d’écriture reste visible et les données en mémoire restent exportables.

Les anciennes données localStorage sont migrées vers IndexedDB à la première ouverture, sur la même origine et dans le même mode. Les originaux ne sont pas supprimés. Seuls des réglages d’affichage et reçus d’export restent dans localStorage ; Firebase gère séparément la persistance de connexion.

### Déclenchements

- Après une modification : **envoi après 3 minutes sans nouvelle modification métier**. Chaque modification relance ces 3 minutes. L’heure du dernier changement est conservée avec les données dans IndexedDB : recharger la page ne remet pas arbitrairement le délai à zéro. Le thème, les réglages d’export et un clic sans modification ne relancent pas le délai.
- Bouton **✓ Enregistrer maintenant**, dans la barre du haut, ou **Compte → Enregistrer et synchroniser** : enregistrement local puis vérification Firebase. Les clics espacés de moins de 10 secondes sont regroupés.
- Connexion, retour du réseau ou retour à un onglet visible : reprise de la réception automatique. Si cet appareil a des modifications en attente, ces événements respectent aussi les 3 minutes d’inactivité avant envoi.
- Passage en arrière-plan / fermeture : tentative de terminer l’écriture locale ; l’écoute distante est arrêtée et l’envoi restant garde son délai de 3 minutes. Si l’onglet reste ouvert, un minuteur encore actif peut envoyer les changements, mais le navigateur peut le suspendre. **Une fermeture ne garantit jamais la fin d’un envoi réseau** : attendre « Synchronisé » avant de changer d’appareil.
- **Une seule écoute Firestore sur le document d’index par onglet visible**, sans écoute des collections ni polling périodique. Une notification serveur déclenche la réception automatique sur l’autre appareil. L’index de la notification est réutilisé, seuls les éléments manquants ou modifiés sont téléchargés. L’écoute s’arrête quand l’onglet est masqué, hors connexion ou déconnecté, puis reprend au retour. Les événements rapprochés sont regroupés (au moins 10 secondes entre deux cycles de réception).
- Changer le thème, plier une section, régler les exports ou exporter un JSON ne déclenche pas un envoi des données métier.

### Coût des opérations

Une vérification manuelle lit un petit index contenant les empreintes des éléments. En réception automatique, cet index est déjà fourni par la notification serveur et n’est pas relu. Le contenu déjà présent dans IndexedDB est réutilisé. Seuls les éléments absents **ou dont la version a changé** sont téléchargés : une présence locale ne suffit pas si l’autre appareil a modifié cet élément.

| Scénario testé, sans erreur réseau ni concurrence | Lectures de documents | Écritures de documents |
| --- | ---: | ---: |
| Application au repos, connexion stable et aucune modification distante | 0 | 0 |
| Vérification, données locales à jour | 1 index | 0 |
| Modification du titre d’une action existante | 1 index + 1 contrôle transactionnel | 1 action + 1 index |
| Réception automatique d’une action modifiée, reste déjà en cache | 1 notification d’index + 1 action | 0 |

L’ouverture ou la reconnexion d’une écoute ajoute une lecture initiale d’index. Les modifications de l’index peuvent aussi notifier l’appareil émetteur ; ces confirmations sont ignorées pour les transferts de contenu. Une création ou suppression peut aussi modifier l’objet d’ordre des listes. Une note très volumineuse occupe plusieurs fragments. Le premier appareil vide doit nécessairement télécharger les données qu’il ne possède pas.

Un garde-fou partagé entre les onglets limite les réservations à **200 lectures et 200 écritures sur une fenêtre glissante de 5 minutes**, **par profil de navigateur et par espace**. Le compteur est lui-même conservé dans IndexedDB et ne repart pas à zéro au rechargement. Il compte deux lectures de précaution pour une transaction, limitée à deux tentatives. Les transferts importants se mettent en pause puis reprennent en utilisant les fragments déjà reçus/envoyés. Les demandes manuelles respectent aussi ce plafond. Les notifications d’index sont comptées et l’écoute est arrêtée si le budget est atteint ; des notifications déjà en transit restent possibles. Les compteurs sont affichés dans le panneau du compte.

Ce garde-fou est propre à Repère, pas une limite serveur du projet : plusieurs appareils additionnent leur consommation ; la console Firebase et les autres clients ne sont pas comptés. Les retransmissions du SDK et l’authentification ne sont pas une mesure exacte de facturation. Consulter **Firestore → Utilisation** pour la consommation réelle.

### Protocole et conflits

Le manifeste révisionné est stocké dans `users/{uid}/sync/state` (format 2). Les affaires, actions, pages, contacts, entreprises, documents, captures, éléments et types d’éléments sont séparés. Le contenu est stocké sous `objects/{empreinte}_{fragment}`. Les fragments sont immuables, vérifiés par SHA-256, et mis en cache dans IndexedDB. L’index n’est publié qu’après l’envoi complet des fragments ; un contrôle transactionnel interdit l’écrasement d’une révision plus récente.

Les anciennes versions de fragments restent conservées pour éviter de supprimer un fragment encore utilisé par un autre appareil ou un transfert en cours. Elles occupent du stockage au fil des modifications ; cette version ne fait pas de nettoyage automatique ni d’historique navigable. Les sauvegardes JSON restent nécessaires. L’index est limité à 700 000 octets et les envois complets à 16 Mio ; un dépassement laisse la copie locale intacte et exportable.

- Un appareil vide reçoit la version existante sans envoyer une base vide.
- Une copie locale non vide jamais associée demande confirmation avant le premier envoi.
- Les mises à jour entrantes attendent la sortie du champ ou la validation du formulaire en cours.
- Si les deux appareils ont changé leur copie, **Conflit à résoudre** propose de conserver la copie locale ou celle de Firebase. Le choix concerne tout l’espace ; aucune fusion automatique des champs n’est annoncée. La version remplacée est conservée dans IndexedDB et exportable depuis le compte.
- Hors connexion, les changements restent dans IndexedDB et sont repris au retour du réseau. La version 1.27 met en cache l’application et les trois modules Firebase nécessaires : après préparation en ligne et connexion persistante, elle peut se rouvrir hors ligne sur le même appareil. Les liens SharePoint/Cockpit demandent leur propre accès réseau.
- La déconnexion masque les données et garde le cache pour le même compte. Ce cache n’est pas chiffré par Repère : utiliser un profil personnel.
- Deux onglets partageant le même cache utilisent un verrou pour éviter de synchroniser en parallèle. Si leurs copies de travail divergent, une protection bloque l’écriture de l’onglet périmé : exporter au besoin, puis le recharger.

IndexedDB résiste aux fermetures ordinaires, mais reste effaçable par un nettoyage du navigateur, une politique de l’ordinateur ou une suppression volontaire. La copie Firebase et les exports datés restent complémentaires.

## Sauvegardes

Les exports JSON manuels et automatiques sont conservés. Un export automatique se déclenche par défaut toutes les 30 minutes après modification, lorsque la page est ouverte et visible, hors formulaire. Le navigateur peut demander une autorisation ou bloquer un téléchargement : contrôler le fichier et utiliser **Vérifier le fichier…**.

Firebase propage aussi les suppressions confirmées. Conserver plusieurs exports datés indépendants. Les sauvegardes planifiées Firestore ne sont pas activées par cette intégration.

## Vérifications à faire avec le compte réel

1. Sur le PC, créer **TEST SYNCHRO** et une action ; vérifier « Enregistré dans IndexedDB » immédiatement, puis l’heure « Envoi auto à … ». Faire une deuxième modification après 2 minutes : l’envoi doit attendre 3 minutes supplémentaires, sans cliquer sur ✓.
2. Sur un second appareil, se connecter avec le même compte et vérifier l’affaire, l’action et leurs détails.
3. Modifier l’action sur le second appareil ; sans appuyer sur ✓, attendre 3 minutes après la dernière modification. Laisser Repère visible sur le PC : l’action doit s’y actualiser automatiquement, hors formulaire en cours. Si le PC était en veille, le changement est récupéré à son retour.
4. Couper le réseau d’un appareil déjà ouvert, modifier une note, puis rétablir le réseau et vérifier l’envoi.
5. Modifier la même base sur les deux appareils pendant qu’un est hors ligne : au retour, contrôler le conflit et les deux exports avant de choisir.
6. Se déconnecter : le contenu doit disparaître et les raccourcis de l’application ne doivent pas agir derrière la connexion.
7. Vérifier dans le panneau du compte que plusieurs minutes au repos ne font pas augmenter les compteurs. Modifier une seule action, puis contrôler le petit nombre d’opérations.
8. Recharger la page et vérifier que les affaires sont reprises depuis IndexedDB.
9. Exporter puis vérifier un JSON. Ne restaurer une sauvegarde qu’après avoir compris que l’import remplace l’espace entier.

## Développement et vérification

Modifier les sources de `src/`, puis reconstruire le fichier principal :

```sh
python3 scripts/build.py
node --test tests/*.test.cjs
```

`src/app.js` et `src/shell.html` contiennent l’application existante. `src/cloud-core.js` contient la décision de synchronisation, la gestion des conflits et le protocole de découpage. `src/cloud-ui.js` contient le compte, les déclenchements et l’intégration avec les données locales. `src/local-db.js` gère IndexedDB, les révisions locales, le verrou entre onglets et le budget. `src/cloud-transport.js` gère les transferts par élément. `src/mobile.js` et `src/mobile.css` portent les vues téléphone ; `src/pwa.js` et `src/service-worker.js` portent l’installation et le cache public. `sw.js` est généré par le build. `scripts/build-icons.py` reproduit les icônes à partir du tracé natif avec Pillow. `tests/indexeddb-browser.js` vérifie le stockage réel dans un navigateur (voir `scripts/prepare-preview.py`).

Les tests automatisés utilisent des données fictives et un transport simulé. Ils couvrent les conflits, les coupures, les courses entre appareils, les erreurs de stockage, l’isolation de session, les fragments, les sauvegardes et les nombres d’opérations. Un banc de 8 vérifications IndexedDB a également été exécuté dans Chrome, ainsi qu’une création de capture, un enregistrement manuel et un rechargement de l’application. Les tests v1.26 simulent le minuteur de 3 minutes, sa remise à zéro, le bouton manuel, les événements de visibilité/réseau, la conservation du délai au rechargement et deux appareils authentifiés avec réception automatique sans lecture supplémentaire au repos. Ils ne prouvent pas que les réglages de votre console Firebase sont publiés : le test réel ci-dessus reste nécessaire.

Les tests v1.27 couvrent les priorités mobiles, la sélection multiple TR1/TR2, la conservation des durées lors des sauvegardes, les références par projet, les filtres sans modification métier et le cache public du service worker. La vérification visuelle utilise une fenêtre intégrée de 320/390/700 px et une largeur PC de 1200 px, avec données fictives. L’installation native iOS/Android et le rechargement hors ligne avec votre compte doivent être vérifiés sur vos appareils réels ; le serveur local de prévisualisation ne fournit pas HTTPS.
