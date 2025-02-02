import { 
  SlashCommandBuilder, 
  ChannelType, 
  PermissionFlagsBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
  ChatInputCommandInteraction
} from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Configurer et gérer le système de tickets')
  .addSubcommand(subcommand =>
    subcommand
      .setName('category')
      .setDescription('Définir la catégorie des tickets')
      .addChannelOption(option =>
        option.setName('category')
          .setDescription('La catégorie où seront créés les tickets')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildCategory)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('message')
      .setDescription('Envoyer le message de création de ticket')
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Le salon où envoyer le message')
          .setRequired(true)
          .addChannelTypes(ChannelType.GuildText)))
  .addSubcommand(subcommand =>
    subcommand
      .setName('close')
      .setDescription('Fermer un ticket'))
  .addSubcommand(subcommand =>
    subcommand
      .setName('reopen')
      .setDescription('Réouvrir un ticket'))
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

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case 'category': {
      const category = interaction.options.getChannel('category', true);
      if (category.type !== ChannelType.GuildCategory) {
        return interaction.reply({
          content: 'Vous devez sélectionner une catégorie.',
          ephemeral: true
        });
      }
      
      await prisma.guild.upsert({
        where: { id: interaction.guildId },
        update: {
          ticketCategoryId: category.id
        },
        create: {
          id: interaction.guildId,
          ticketCategoryId: category.id
        }
      });

      await interaction.reply({
        content: `La catégorie des tickets a été définie sur ${category.name}`,
        ephemeral: true
      });
      break;
    }

    case 'message': {
      const channel = interaction.options.getChannel('channel', true);
      if (channel.type !== ChannelType.GuildText) {
        return interaction.reply({
          content: 'Vous devez sélectionner un salon textuel.',
          ephemeral: true
        });
      }

      const row = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('ticket_create')
            .setPlaceholder('Sélectionnez une catégorie')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([
              {
                label: 'Bug',
                description: 'Signaler un bug',
                value: 'bug',
                emoji: '🐛'
              },
              {
                label: 'Réclamation de récompense',
                description: 'Réclamer une récompense',
                value: 'reward',
                emoji: '🎁'
              },
              {
                label: 'Signalement',
                description: 'Signaler un utilisateur',
                value: 'report',
                emoji: '🚨'
              }
            ])
        );

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('🎫 Création de ticket')
        .setDescription('Sélectionnez une catégorie pour créer un ticket')
        .setTimestamp();

      await channel.send({
        embeds: [embed],
        components: [row]
      });

      await interaction.reply({
        content: 'Le message de création de ticket a été envoyé',
        ephemeral: true
      });
      break;
    }

    case 'close':
    case 'reopen': {
      if (!interaction.guild || !interaction.channel) {
        return interaction.reply({
          content: 'Cette commande doit être utilisée dans un salon de texte d\'un serveur.',
          ephemeral: true
        });
      }
      if (!interaction.channel.isTextBased() || interaction.channel.isDMBased()) {
        return interaction.reply({
          content: 'Cette commande doit être utilisée dans un salon de texte d\'un serveur.',
          ephemeral: true
        });
      }

      if (!('name' in interaction.channel) || interaction.channel.name.split('-').length !== 3) {
        return interaction.reply({
          content: 'Cette commande doit être utilisée dans un ticket.',
          ephemeral: true
        });
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);
      const guildData = await prisma.guild.findUnique({
        where: { id: interaction.guildId }
      });

      if (!guildData) {
        return interaction.reply({
          content: 'La configuration du serveur n\'a pas été trouvée.',
          ephemeral: true
        });
      }

      const moderationRoles = JSON.parse(guildData.moderationRoles || '[]') as string[];
      const hasPermission = member.roles.cache.some((role: any) => moderationRoles.includes(role.id));

      if (!hasPermission) {
        return interaction.reply({
          content: 'Vous n\'avez pas la permission de gérer les tickets.',
          ephemeral: true
        });
      }

      const ticket = await prisma.ticket.findFirst({
        where: { 
          OR: [
            { id: interaction.channelId },
            { channelId: interaction.channelId }
          ]
        }
      });

      if (!ticket) {
        return interaction.reply({
          content: 'Ce ticket n\'existe pas dans la base de données.',
          ephemeral: true
        });
      }

      const channel = interaction.channel as TextChannel;

      if (subcommand === 'close') {
        if (ticket.status === 'closed') {
          return interaction.reply({
            content: 'Ce ticket est déjà fermé.',
            ephemeral: true
          });
        }

        try {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { 
              status: 'closed',
              channelId: interaction.channelId
            }
          });

          const parts = channel.name.split('-');
          if (parts.length >= 2) {
            const newName = `${parts[0]}-${parts[1]}-fermé`;

            const closeEmbed = new EmbedBuilder()
              .setColor('#ff0000')
              .setTitle('Ticket Fermé')
              .setDescription(`Ticket fermé par ${interaction.user.tag}`)
              .setTimestamp();

            const archiveRow = new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setCustomId('ticket_delete')
                  .setLabel('Supprimer le ticket')
                  .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                  .setCustomId('ticket_reopen')
                  .setLabel('Réouvrir le ticket')
                  .setStyle(ButtonStyle.Success)
              );

            await channel.send({
              embeds: [closeEmbed],
              components: [archiveRow]
            });

            await channel.permissionOverwrites.edit(ticket.userId, {
              SendMessages: false
            });
            try {
              const renamePromise = channel.setName(newName);
              await Promise.race([
                renamePromise,
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), 5000)
                )
              ]);
            } catch (error) {
              console.error('[ERROR] Failed to rename channel (continuing anyway):', error);
            }

            await interaction.reply({
              content: 'Le ticket a été fermé.',
              ephemeral: true
            });
          }
        } catch (error) {
          console.error('[ERROR] Error during ticket close:', error);
          await interaction.reply({
            content: 'Une erreur est survenue lors de la fermeture du ticket.',
            ephemeral: true
          });
        }
      } else if (subcommand === 'reopen') {
        if (ticket.status === 'open') {
          return interaction.reply({
            content: 'Ce ticket est déjà ouvert.',
            ephemeral: true
          });
        }

        try {
          const parts = channel.name.split('-');
          if (parts.length >= 2) {
            const newName = `${parts[0]}-${parts[1]}-ouvert`;
            await channel.permissionOverwrites.edit(ticket.userId, {
              ViewChannel: true,
              SendMessages: true,
              ReadMessageHistory: true
            });

            await prisma.ticket.update({
              where: { id: ticket.id },
              data: { 
                status: 'open',
                channelId: interaction.channelId
              }
            });
            const reopenEmbed = new EmbedBuilder()
              .setColor('#00ff00')
              .setTitle('Ticket Réouvert')
              .setDescription(`Ticket réouvert par ${interaction.user.tag}`)
              .setTimestamp();

            await channel.send({
              content: `<@${ticket.userId}>`,
              embeds: [reopenEmbed]
            });

            const ticketEmbed = new EmbedBuilder()
              .setColor('#0099ff')
              .setTitle(`Ticket - ${parts[0]}`)
              .setDescription(
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

            await channel.send({
              embeds: [ticketEmbed],
              components: [closeButton]
            });

            try {
              const renamePromise = channel.setName(newName);
              await Promise.race([
                renamePromise,
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Timeout')), 5000)
                )
              ]);
            } catch (error) {
              console.error('[ERROR] Failed to rename channel (continuing anyway):', error);
            }

            await interaction.reply({
              content: 'Le ticket a été réouvert.',
              ephemeral: true
            });
          }
        } catch (error) {
          console.error('[ERROR] Error during ticket reopen:', error);
          await interaction.reply({
            content: 'Une erreur est survenue lors de la réouverture du ticket.',
            ephemeral: true
          });
        }
      }
      break;
    }
  }
} 