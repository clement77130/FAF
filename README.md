# Bot Discord Tresorsky

Un bot Discord multifonctionnel avec système de tickets, giveaways, modération et système de bienvenue.

## Crédits

**Projet créé et développé par xdLulux (295515087731556362)**  
Tous droits réservés © 2025

## Tech Stack

- TypeScript
- Discord.js v14
- Prisma (SQLite)
- Node.js v20+

## Prérequis

- Node.js version 20 ou supérieure
- npm (inclus avec Node.js)
- Un bot Discord avec les permissions nécessaires

## Fonctionnalités

- **Système de Bienvenue**
  - Message de bienvenue personnalisé
  - Tracking des invitations
  - Statistiques des invitations

- **Système de Modération**
  - Ban/Unban
  - Kick
  - Mute temporaire
  - Logs de modération
  - Rôles de modération configurables

- **Système de Tickets**
  - Création via menu déroulant
  - Catégories personnalisables
  - Transcription des tickets
  - Système d'archivage

- **Système de Giveaway**
  - Création simple
  - Participation via bouton
  - Reroll des gagnants
  - Fin automatique

## Liste des Commandes

### Général
- `/about` - Affiche les informations sur le bot (Version, Uptime, Créateur, etc.)

### Configuration
- `/mod add <role>` - Ajouter un rôle de modération (Admin)
- `/mod remove <role>` - Retirer un rôle de modération (Admin)
- `/mod list` - Voir la liste des rôles de modération (Admin)
- `/setwelcome <channel>` - Définir le salon de bienvenue (Admin)
- `/logs output <channel>` - Définir le salon des logs (Admin)

### Modération
- `/ban <user> <reason> [duration]` - Bannir un utilisateur (Mod)
  > Exemple: `/ban @user Spam 7d`
- `/unban <user>` - Débannir un utilisateur (Mod)
  > Exemple: `/unban 123456789`
- `/kick <user> <reason>` - Expulser un utilisateur (Mod)
  > Exemple: `/kick @user Comportement inapproprié`
- `/mute <user> <duration> <reason>` - Muter temporairement un utilisateur (Mod)
  > Exemple: `/mute @user 1h Spam`

### Tickets
- `/ticket category <category>` - Définir la catégorie des tickets (Admin)
- `/ticket message <channel>` - Envoyer le message de création de ticket (Admin)
- `/ticket close` - Fermer un ticket (Mod)
- `/ticket reopen` - Réouvrir un ticket (Mod)

### Giveaways
- `/gstart <titre> <description> <winners> <duration>` - Créer un giveaway (Admin)
  > Exemple: `/gstart "Nitro" "Gagnez un mois de Nitro!" 1 24h`
- `/greroll <messageid>` - Relancer un giveaway terminé (Admin)
  > Exemple: `/greroll 123456789`

### Invitations
- `/invites [user]` - Voir ses statistiques d'invitations ou celles d'un utilisateur
  > Exemple: `/invites @user`
- `/leaderboard` - Voir le classement des invitations
- `/admininvites add <user> <amount>` - Ajouter des invitations bonus (Admin)
  > Exemple: `/admininvites add @user 5`
- `/admininvites remove <user> <amount>` - Retirer des invitations bonus (Admin)
  > Exemple: `/admininvites remove @user 2`

### Embeds
- `/embedcreator simple <titre> <description> <couleur> <footer> [channel]` - Créer un embed simple (Mod)
  > Exemple: `/embedcreator simple "Titre" "Description" #FF0000 "Footer"`
- `/embedcreator json <json> [channel]` - Créer un embed avancé via Discohook (Mod)
  > Utilisez https://discohook.org pour créer votre embed

Note: (Admin) = Nécessite les permissions administrateur, (Mod) = Nécessite un rôle de modération

## Installation sur Ubuntu

1. Installer Node.js 20 et npm
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2. Vérifier l'installation
```bash
node --version # Doit afficher v20.x.x
npm --version
```

3. Cloner le repository
```bash
git clone https://github.com/Tresorsky/Tresorsky-Bot.git
```
4. Installer les dépendances
```bash
npm install
```
5. Configurer les variables d'environnement
```bash
cp .env.example .env
nano .env
```

6. Déployer les commandes slash
```bash
npm run deploy
```

7. Initialiser la base de données
```bash
npx prisma migrate dev
```

8. Compiler le TypeScript
```bash
npm run build
```

9. Lancer le bot
```bash
npm start
```
