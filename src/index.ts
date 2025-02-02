import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { join } from 'path';
import { readdirSync } from 'fs';
import { initDatabase } from './utils/initDatabase';

declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, any>;
  }
}

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.MessageContent,
  ]
});

client.commands = new Collection();

const commandsPath = join(__dirname, 'commands');
const commandFolders = readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = join(commandsPath, folder);
  const commandFiles = readdirSync(folderPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));
  
  for (const file of commandFiles) {
    const filePath = join(folderPath, file);
    import(filePath).then(command => {
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
      }
    });
  }
}

const eventsPath = join(__dirname, 'events');
const eventFiles = readdirSync(eventsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = join(eventsPath, file);
  import(filePath).then(event => {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(...args));
    }
  }).catch(error => {
    console.error(`Erreur lors du chargement de l'événement ${file}:`, error);
  });
}

initDatabase().then(() => {
  client.login(process.env.TOKEN);
}).catch(error => {
  console.error('Erreur fatale lors de l\'initialisation:', error);
  process.exit(1);
});

export { client }; 