import { query, transaction, setUserContext } from '../utils/database';
import { encrypt, decrypt, EncryptedData } from '../utils/crypto';

export type MessageSender = 'userA' | 'userB' | 'ai';

export interface Message {
  id: string;
  session_id: string;
  sender: MessageSender;
  content: string; // Decrypted content
  created_at: Date;
  safety_tags: string[];
  client_message_id: string;
}

export interface CreateMessageRequest {
  sender: MessageSender;
  content: string;
  clientMessageId: string;
}

export interface CreateMessageResponse {
  messageId: string;
  content: string;
  createdAt: string;
}

export class MessageModel {
  static async create(
    sessionId: string, 
    request: CreateMessageRequest, 
    userId: string
  ): Promise<CreateMessageResponse> {
    return await transaction(async (client) => {
      await setUserContext(client, userId);
      
      const { sender, content, clientMessageId } = request;
      
      // Validate content length
      if (!content || content.length > 4000) {
        throw new Error('Content must be 1-4000 characters');
      }
      
      // Check for duplicate client_message_id
      const existingResult = await client.query(
        'SELECT id FROM messages WHERE client_message_id = $1 AND session_id = $2',
        [clientMessageId, sessionId]
      );
      
      if (existingResult.rows.length > 0) {
        // Return existing message (idempotent)
        const existing = existingResult.rows[0];
        const messageResult = await client.query(
          'SELECT * FROM messages WHERE id = $1',
          [existing.id]
        );
        
        const message = messageResult.rows[0];
        const decryptedContent = decrypt(JSON.parse(message.content_enc) as EncryptedData);
        
        return {
          messageId: message.id,
          content: decryptedContent,
          createdAt: message.created_at.toISOString(),
        };
      }
      
      // Encrypt content
      const encryptedContent = encrypt(content);
      
      // Create message
      const result = await client.query(
        `INSERT INTO messages (session_id, sender, content_enc, safety_tags, client_message_id) 
         VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
        [
          sessionId,
          sender,
          JSON.stringify(encryptedContent),
          [], // Safety tags will be populated by AI processing
          clientMessageId
        ]
      );
      
      const message = result.rows[0];
      
      return {
        messageId: message.id,
        content,
        createdAt: message.created_at.toISOString(),
      };
    });
  }
  
  static async getMessages(
    sessionId: string, 
    after?: string, 
    userId?: string
  ): Promise<Message[]> {
    let queryText = 'SELECT * FROM messages WHERE session_id = $1';
    const params: any[] = [sessionId];
    
    if (after) {
      queryText += ' AND created_at > $2';
      params.push(after);
    }
    
    queryText += ' ORDER BY created_at ASC';
    
    const result = await query(queryText, params);
    
    // Decrypt all messages
    const messages = result.rows.map((row: any) => ({
      id: row.id,
      session_id: row.session_id,
      sender: row.sender,
      content: decrypt(JSON.parse(row.content_enc) as EncryptedData),
      created_at: row.created_at,
      safety_tags: row.safety_tags || [],
      client_message_id: row.client_message_id,
    }));
    
    return messages;
  }
  
  static async getMessagesAfter(
    sessionId: string, 
    after: string, 
    userId?: string
  ): Promise<Message[]> {
    return this.getMessages(sessionId, after, userId);
  }
  
  static async addSafetyTags(messageId: string, tags: string[]): Promise<void> {
    await query(
      'UPDATE messages SET safety_tags = $1 WHERE id = $2',
      [tags, messageId]
    );
  }
  
  static async deleteBySession(sessionId: string, userId: string): Promise<void> {
    return await transaction(async (client) => {
      await setUserContext(client, userId);
      await client.query('DELETE FROM messages WHERE session_id = $1', [sessionId]);
    });
  }
  
  static async getLatestMessage(sessionId: string): Promise<Message | null> {
    const result = await query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1',
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      session_id: row.session_id,
      sender: row.sender,
      content: decrypt(JSON.parse(row.content_enc) as EncryptedData),
      created_at: row.created_at,
      safety_tags: row.safety_tags || [],
      client_message_id: row.client_message_id,
    };
  }
}
