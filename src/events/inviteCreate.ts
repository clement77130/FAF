import { Events, Invite } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const name = Events.InviteCreate;

export async function execute(invite: Invite) {
  if (!invite.guild) return;

  await prisma.guild.upsert({
    where: { id: invite.guild.id },
    create: {
      id: invite.guild.id,
      moderationRoles: '[]'
    },
    update: {}
  });

  await prisma.invite.create({
    data: {
      id: invite.code,
      guildId: invite.guild.id,
      inviterId: invite.inviter?.id || '0',
      uses: 0
    }
  });
} 