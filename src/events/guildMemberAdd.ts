import { EmbedBuilder, Events, GuildMember } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const name = Events.GuildMemberAdd;

export async function execute(member: GuildMember) {
  try {
    console.log('⏳ Nouveau membre détecté:', member.user.tag);
    
    await prisma.guild.upsert({
      where: { id: member.guild.id },
      create: { 
        id: member.guild.id,
        moderationRoles: '[]'
      },
      update: {}
    });

    const invites = await member.guild.invites.fetch();

    const usedInvite = invites.find(invite => invite.inviter);
    if (!usedInvite || !usedInvite.inviter) {
      console.log('❌ Impossible de trouver l\'invitation utilisée');
      return;
    }

    console.log(`📥 ${member.user.tag} a rejoint en utilisant l'invitation de ${usedInvite.inviter.tag} (${usedInvite.code})`);

    const accountAge = Date.now() - member.user.createdTimestamp;
    const isFake = accountAge < 7 * 24 * 60 * 60 * 1000; // 7 jours
    if (isFake) {
      console.log('⚠️ Compte potentiellement suspect (créé il y a moins de 7 jours)');
    }

    const existingMemberJoin = await prisma.memberJoin.findUnique({
      where: {
        memberId_guildId: {
          memberId: member.id,
          guildId: member.guild.id
        }
      },
      include: {
        invite: true
      }
    });

    let hasReturned = false;
    if (existingMemberJoin) {
      console.log(`📎 Ce membre était déjà venu, invité précédemment par ${existingMemberJoin.invite.inviterId}`);
      hasReturned = true;

      await prisma.invite.update({
        where: {
          id_guildId: {
            id: existingMemberJoin.inviteId,
            guildId: member.guild.id
          }
        },
        data: {
          left: { decrement: 1 }
        }
      });
    }

    const invite = await prisma.invite.upsert({
      where: {
        id_guildId: {
          id: usedInvite.code,
          guildId: member.guild.id
        }
      },
      create: {
        id: usedInvite.code,
        guildId: member.guild.id,
        inviterId: usedInvite.inviter.id,
        uses: 1,
        left: 0,
        fake: isFake ? 1 : 0,
        bonus: 0
      },
      update: {
        uses: existingMemberJoin?.invite.inviterId === usedInvite.inviter.id 
          ? undefined 
          : { increment: 1 },
        fake: isFake ? { increment: 1 } : undefined
      }
    });

    if (existingMemberJoin) {
      await prisma.memberJoin.update({
        where: {
          memberId_guildId: {
            memberId: member.id,
            guildId: member.guild.id
          }
        },
        data: {
          inviteId: usedInvite.code,
          joinedAt: new Date()
        }
      });
    } else {
      await prisma.memberJoin.create({
        data: {
          memberId: member.id,
          guildId: member.guild.id,
          inviteId: usedInvite.code,
          joinedAt: new Date()
        }
      });
    }

    const guildData = await prisma.guild.findUnique({
      where: { id: member.guild.id }
    });

    if (!guildData?.welcomeChannelId) return;

    const welcomeChannel = member.guild.channels.cache.get(guildData.welcomeChannelId);
    if (!welcomeChannel?.isTextBased()) return;

    const welcomeEmbed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle(`Bienvenue sur ${member.guild.name}`)
      .setURL('https://tresorsky.fr')
      .setThumbnail(member.user.displayAvatarURL())
      .setDescription(
        `${member.user} vient de nous rejoindre.\n` +
        `Invité par ${usedInvite.inviter}.\n` +
        `${hasReturned ? '(Ce membre était déjà venu auparavant)\n' : ''}` +
        `Le serveur compte désormais ${member.guild.memberCount} membres.`
      )
      .setTimestamp();

    await welcomeChannel.send({ embeds: [welcomeEmbed] });
    console.log('✅ Nouveau membre traité avec succès');
  } catch (error) {
    console.error('❌ Erreur dans guildMemberAdd:', error);
    console.error(error);
  }
} 