import { Client, ButtonInteraction } from 'discord.js';
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export interface VoteEntry {
  imageUrl: string;
  prompt: string;
  caption: string; // Fun caption for the tweet
  votes: Set<string>;
  number: number;
}

export interface VoteData {
  entries: VoteEntry[];
  endTime: number;
  messageId: string;
  currentIndex: number; // Track current image in slideshow
}

export const numberEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];

// Store active votes
const activeVotes = new Map<string, VoteData>();

export function getActiveVote(channelId: string): VoteData | undefined {
  return activeVotes.get(channelId);
}

export function setActiveVote(channelId: string, voteData: VoteData): void {
  activeVotes.set(channelId, voteData);
}

export function removeActiveVote(channelId: string): void {
  activeVotes.delete(channelId);
}

export async function handleVoteButton(interaction: ButtonInteraction, client: Client): Promise<void> {
  logger.info({ userId: interaction.user.id }, 'Vote button clicked');
  
  try {
    const [action, index] = interaction.customId.split('_');
    if (action !== 'vote') return;

    const voteData = activeVotes.get(interaction.channelId);
    if (!voteData) {
      await interaction.reply({ content: 'This vote has ended.', ephemeral: true });
      return;
    }

    if (Date.now() > voteData.endTime) {
      await interaction.reply({ content: 'This vote has ended.', ephemeral: true });
      return;
    }

    const entry = voteData.entries[parseInt(index)];
    if (!entry) {
      await interaction.reply({ content: 'Invalid vote option.', ephemeral: true });
      return;
    }

    // Remove previous vote if exists
    voteData.entries.forEach((e: VoteEntry) => e.votes.delete(interaction.user.id));
    
    // Add new vote
    entry.votes.add(interaction.user.id);

    await interaction.reply({ 
      content: `You voted for Image ${entry.number}!`, 
      ephemeral: true 
    });

    logger.info({
      userId: interaction.user.id,
      imageNumber: entry.number,
      channelId: interaction.channelId
    }, 'Vote recorded');

  } catch (error) {
    logger.error({ error }, 'Error handling vote button');
    await interaction.reply({ 
      content: 'An error occurred while processing your vote.', 
      ephemeral: true 
    });
  }
} 