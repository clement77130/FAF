import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Bannir un membre')
  .addUserOption(option =>
    option.setName('user')
      .setDescription('Le membre à bannir')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('reason')
      .setDescription('La raison du bannissement')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
  }

  const guildData = await prisma.guild.findUnique({
    where: { id: interaction.guildId }
  });

  const moderationRoles = guildData?.moderationRoles ? JSON.parse(guildData.moderationRoles) as string[] : [];
  const member = interaction.member as GuildMember;
  
  const hasPermission = member.roles.cache.some((role) => 
    moderationRoles.includes(role.id)
  );

  if (!hasPermission) {
    return interaction.reply({
      content: "Vous n'avez pas la permission d'utiliser cette commande.",
      ephemeral: true
    });
  }

  const user = interaction.options.getUser('user', true);
  const reason = interaction.options.getString('reason', true);
  if (!interaction.guild) {
    return interaction.reply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });
  }
  const memberToBan = await interaction.guild.members.fetch(user.id).catch(() => null);

  if (!memberToBan) {
    return interaction.reply({
      content: "Membre introuvable.",
      ephemeral: true
    });
  }

  if (!memberToBan.bannable) {
    return interaction.reply({
      content: "Je ne peux pas bannir ce membre.",
      ephemeral: true
    });
  }

  const banEmbed = new EmbedBuilder()
    .setColor('#ff0000')
    .setTitle('🔨 Bannissement')
    .setDescription(`**Membre banni:** ${user.tag}\n**Raison:** ${reason}\n**Modérateur:** ${interaction.user.tag}`)
    .setTimestamp();

  await memberToBan.ban({ reason });

  if (guildData?.logChannelId) {
    if (!interaction.guild) return;
    const logChannel = interaction.guild.channels.cache.get(guildData.logChannelId);
    if (logChannel?.isTextBased()) {
      await logChannel.send({ embeds: [banEmbed] });
    }
  }

  await interaction.reply({
    content: `${user.tag} a été banni avec succès.`,
    ephemeral: true
  });
} 