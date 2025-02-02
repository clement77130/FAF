import { 
  ModalSubmitInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function handleCreate(interaction: ModalSubmitInteraction<'cached'>) {
  const ticketType = interaction.customId.split('_')[2];
  const pseudo = interaction.fields.getTextInputValue('pseudo');
  const explanation = interaction.fields.getTextInputValue('explanation');

  if (!interaction.guild || !interaction.guildId) {
    await interaction.reply({
      content: 'Cette commande doit être utilisée dans un serveur.',
      ephemeral: true
    });
    return;
  }

  const guildData = await prisma.guild.findUnique({
    where: { id: interaction.guildId }
  });

  if (!guildData?.ticketCategoryId) {
    await interaction.reply({
      content: 'La catégorie des tickets n\'a pas été configurée.',
      ephemeral: true
    });
    return;
  }

  const category = interaction.guild.channels.cache.get(guildData.ticketCategoryId);
  if (!category) {
    await interaction.reply({
      content: 'La catégorie des tickets est introuvable.',
      ephemeral: true
    });
    return;
  }

  const ticketChannel = await interaction.guild.channels.create({
    name: `${pseudo}-${ticketType}-ouvert`,
    type: ChannelType.GuildText,
    parent: category.id,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: interaction.user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.ReadMessageHistory
        ]
      }
    ]
  });

  await prisma.ticket.create({
    data: {
      id: ticketChannel.id,
      guildId: interaction.guildId,
      userId: interaction.user.id,
      channelId: ticketChannel.id,
      category: ticketType,
      status: 'open'
    }
  });

  const ticketEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle(`Ticket - ${interaction.user.tag}`)
    .setDescription(
      `**Type:** ${ticketType}\n` +
      `**Créé par:** ${interaction.user}\n` +
      `**Pseudo:** ${pseudo}\n` +
      `**Explication:** ${explanation}\n\n` +
      'Un membre du staff vous répondra dès que possible.\n' +
      'Pour fermer le ticket, utilisez la commande `/ticket close` ou le bouton ci-dessous.'
    )
    .setTimestamp();

  const closeButton = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('Fermer le ticket')
        .setStyle(ButtonStyle.Danger)
    );

  await ticketChannel.send(`${interaction.user}`);

  await ticketChannel.send({
    embeds: [ticketEmbed],
    components: [closeButton]
  });

  await interaction.reply({
    content: `Votre ticket a été créé: ${ticketChannel}`,
    ephemeral: true
  });
} 