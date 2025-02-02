import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ChannelType, MessageFlags, ChatInputCommandInteraction } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import ms from 'ms';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName('gstart')
  .setDescription('Démarrer un giveaway')
  .addStringOption(option =>
    option.setName('titre')
      .setDescription('Le titre du giveaway')
      .setRequired(true))
  .addStringOption(option =>
    option.setName('description')
      .setDescription('La description du giveaway')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('winners')
      .setDescription('Le nombre de gagnants')
      .setRequired(true)
      .setMinValue(1))
  .addStringOption(option =>
    option.setName('duration')
      .setDescription('La durée du giveaway (ex: 1h, 1d, 1w)')
      .setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.inCachedGuild()) {
    return interaction.reply({
      content: 'Cette commande doit être utilisée dans un serveur.',
      ephemeral: true
    });
  }

  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: 'Vous devez être administrateur pour utiliser cette commande.',
      ephemeral: true
    });
  }

  if (!interaction.channel || interaction.channel.type !== ChannelType.GuildText) {
    return interaction.reply({ content: 'Canal introuvable.', ephemeral: true });
  }

  const title = interaction.options.getString('titre', true);
  const description = interaction.options.getString('description', true);
  const winners = interaction.options.getInteger('winners', true);
  const duration = interaction.options.getString('duration', true);

  const durationMs = ms(duration);
  if (!durationMs) {
    return interaction.reply({
      content: 'Format de durée invalide. Utilisez par exemple: 1h, 1d, 1w',
      ephemeral: true
    });
  }

  const endTime = new Date(Date.now() + durationMs);

  const giveawayEmbed = new EmbedBuilder()
    .setColor('#FF69B4')
    .setTitle('🎉 ' + title)
    .setDescription(description)
    .addFields([
      { name: '🏆 Gagnants', value: winners.toString(), inline: true },
      { name: '⌛ Fin', value: `<t:${Math.floor(endTime.getTime() / 1000)}:R>`, inline: true },
      { name: '👥 Participants', value: '0', inline: true },
      { name: '🎮 Host', value: interaction.user.toString(), inline: false }
    ])
    .setFooter({ text: 'Cliquez sur le bouton ci-dessous pour participer!' })
    .setTimestamp(endTime);

  const row = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_enter')
        .setLabel('Participer 🎉')
        .setStyle(ButtonStyle.Success)
    );

  const message = await interaction.channel.send({
    embeds: [giveawayEmbed],
    components: [row]
  });

  await prisma.guild.upsert({
    where: { id: interaction.guildId },
    create: { 
      id: interaction.guildId,
      moderationRoles: '[]'
    },
    update: {}
  });

  await prisma.giveaway.create({
    data: {
      id: message.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      messageId: message.id,
      prize: title,
      description: description,
      winners: winners,
      endTime: endTime,
      hostId: interaction.user.id
    }
  });

  await interaction.reply({
    content: 'Le giveaway a été créé avec succès!',
    flags: MessageFlags.Ephemeral
  });
} 