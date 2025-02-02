import { SlashCommandBuilder, EmbedBuilder, version as discordVersion, MessageFlags } from 'discord.js';
import { version as botVersion } from '../../../package.json';

export const data = new SlashCommandBuilder()
  .setName('about')
  .setDescription('Affiche les informations sur le bot');

export async function execute(interaction: any) {
  const startTime = Date.now();
  
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  const seconds = Math.floor(uptime % 60);

  const uptimeString = `${days}j ${hours}h ${minutes}m ${seconds}s`;
  
  const apiPing = interaction.client.ws.ping <= 0 ? "< 1" : interaction.client.ws.ping;
  const botPing = Date.now() - startTime <= 0 ? "< 1" : Date.now() - startTime;

  const embed = new EmbedBuilder()
    .setColor('#FF69B4')
    .setTitle('📊 À propos du BOT')
    .setDescription('Bot multifonctionnel avec système de tickets, giveaways, modération et système de bienvenue.')
    .addFields([
      { name: '👑 Créateur', value: '[xdLulux](https://discord.com/users/295515087731556362)', inline: true },
      { name: '⚙️ Version', value: `v${botVersion}`, inline: true },
      { name: '🔼 Uptime', value: uptimeString, inline: true },
      { name: '📚 Discord.js', value: `v${discordVersion}`, inline: true },
      { name: '📡 Node.js', value: `${process.version}`, inline: true },
      { name: '🏓 Latence API', value: `${apiPing}ms`, inline: true },
      { name: '⚡ Latence Bot', value: `${botPing}ms`, inline: true },
      { name: '🌐 Serveurs', value: `${interaction.client.guilds.cache.size}`, inline: true },
      // { name: '👥 Utilisateurs', value: `${interaction.client.users.cache.size}`, inline: true },
      { name: '💬 Commandes', value: `${interaction.client.commands.size}`, inline: true }
    ])
    .setTimestamp()
    .setFooter({ text: 'Tous droits réservés © 2024' });

  await interaction.reply({ 
    embeds: [embed], 
    flags: MessageFlags.Ephemeral 
  });
} 