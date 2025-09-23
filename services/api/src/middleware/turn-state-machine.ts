import { FastifyRequest, FastifyReply } from 'fastify';

type TurnState = 'awaitingA' | 'awaitingB' | 'ai_reflect' | 'boundary';

interface TurnStateValidation {
  isValid: boolean;
  currentState: TurnState;
  expectedState: TurnState;
  error?: string;
}

export class TurnStateMachine {
  /**
   * Validate if user can send message in current turn state
   */
  static validateTurn(
    currentState: TurnState,
    userId: string,
    userAId: string,
    userBId: string
  ): TurnStateValidation {
    let expectedState: TurnState;
    let isValid = false;

    // Determine expected state based on user
    if (userId === userAId) {
      expectedState = 'awaitingA';
    } else if (userId === userBId) {
      expectedState = 'awaitingB';
    } else {
      return {
        isValid: false,
        currentState,
        expectedState: 'awaitingA',
        error: 'User not part of this couple'
      };
    }

    // Check if current state allows this user to send message
    if (currentState === expectedState) {
      isValid = true;
    } else if (currentState === 'boundary') {
      return {
        isValid: false,
        currentState,
        expectedState,
        error: 'Session has reached safety boundary - no more messages allowed'
      };
    } else if (currentState === 'ai_reflect') {
      return {
        isValid: false,
        currentState,
        expectedState,
        error: 'AI is currently processing - please wait'
      };
    } else {
      return {
        isValid: false,
        currentState,
        expectedState,
        error: `It is not your turn - currently ${currentState}`
      };
    }

    return {
      isValid,
      currentState,
      expectedState
    };
  }

  /**
   * Get next state after user sends message
   */
  static getNextStateAfterMessage(currentState: TurnState, userId: string, userAId: string, userBId: string): TurnState {
    if (currentState === 'awaitingA' && userId === userAId) {
      return 'awaitingB';
    } else if (currentState === 'awaitingB' && userId === userBId) {
      return 'ai_reflect';
    }
    
    // If both users have sent messages, move to AI reflection
    return 'ai_reflect';
  }

  /**
   * Get state after AI completes reflection
   */
  static getStateAfterAI(): TurnState {
    return 'awaitingA'; // Reset to user A's turn
  }

  /**
   * Get state when boundary is hit
   */
  static getBoundaryState(): TurnState {
    return 'boundary';
  }

  /**
   * Check if state allows new messages
   */
  static canSendMessage(state: TurnState): boolean {
    return state === 'awaitingA' || state === 'awaitingB';
  }

  /**
   * Check if state is in AI processing
   */
  static isAIProcessing(state: TurnState): boolean {
    return state === 'ai_reflect';
  }

  /**
   * Check if state is boundary locked
   */
  static isBoundaryLocked(state: TurnState): boolean {
    return state === 'boundary';
  }
}

/**
 * Middleware to validate turn state
 */
export function createTurnStateMiddleware() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { id: sessionId } = request.params as { id: string };
    const user = (request as any).user;
    
    if (!user || !sessionId) {
      return; // Let other middleware handle validation
    }

    // Get session from database (in production)
    // For now, we'll use in-memory storage
    const session = (request as any).session;
    if (!session) {
      reply.code(404).send({ error: 'Session not found' });
      return false;
    }

    // Get couple information
    const couple = (request as any).couple;
    if (!couple) {
      reply.code(404).send({ error: 'Couple not found' });
      return false;
    }

    // Validate turn state
    const validation = TurnStateMachine.validateTurn(
      session.turn_state || 'awaitingA',
      user.id,
      couple.userAId,
      couple.userBId
    );

    if (!validation.isValid) {
      reply.code(409).send({
        error: 'TURN_LOCKED',
        message: validation.error,
        currentState: validation.currentState,
        expectedState: validation.expectedState
      });
      return false;
    }

    return true;
  };
}

/**
 * Update turn state after message
 */
export function updateTurnStateAfterMessage(
  session: any,
  userId: string,
  userAId: string,
  userBId: string
): TurnState {
  const currentState = session.turn_state || 'awaitingA';
  const nextState = TurnStateMachine.getNextStateAfterMessage(currentState, userId, userAId, userBId);
  
  // Update session state
  session.turn_state = nextState;
  
  return nextState;
}

/**
 * Update turn state after AI reflection
 */
export function updateTurnStateAfterAI(session: any): TurnState {
  const nextState = TurnStateMachine.getStateAfterAI();
  session.turn_state = nextState;
  return nextState;
}

/**
 * Update turn state to boundary
 */
export function updateTurnStateToBoundary(session: any): TurnState {
  const nextState = TurnStateMachine.getBoundaryState();
  session.turn_state = nextState;
  return nextState;
}
