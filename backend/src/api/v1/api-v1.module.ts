import { CacheModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AgentsModule } from '../../agents/agents.module';
import { AgentWorkoutController } from './workout.controller';
import { AgentDashboardController } from './dashboard.controller';
import { AgentFinanceController } from './finance.controller';
import { AgentHabitsController } from './habits.controller';

// Workout dependencies
import { WorkoutSession } from '../../workout/sessions/session.entity';
import { WorkoutSet } from '../../workout/sets/set.entity';
import { WorkoutExercise } from '../../workout/exercises/exercise.entity';
import { WorkoutCategory } from '../../workout/categories/category.entity';
import { BodyWeightEntry } from '../../workout/bodyweight/bodyweight.entity';
import { WorkoutSessionsService } from '../../workout/sessions/sessions.service';
import { WorkoutExercisesService } from '../../workout/exercises/exercises.service';
import { BodyWeightService } from '../../workout/bodyweight/bodyweight.service';

// Dashboard dependencies
import { Stream } from '../../music/streams/stream.entity';
import { Track } from '../../music/tracks/track.entity';
import { DashboardService } from '../../dashboard/dashboard.service';

// Finance dependencies
import { FinanceTransaction } from '../../finance/entities/transaction.entity';
import { FinanceWallet } from '../../finance/entities/wallet.entity';
import { FinanceCategory } from '../../finance/entities/category.entity';
import { FinanceSubscription } from '../../finance/entities/subscription.entity';
import { TransactionsService } from '../../finance/transactions/transactions.service';
import { WalletsService } from '../../finance/wallets/wallets.service';
import { CategoriesService } from '../../finance/categories/categories.service';
import { SubscriptionsService } from '../../finance/subscriptions/subscriptions.service';

/**
 * API v1 module — REST endpoints for agent (AI) access.
 * All endpoints require X-API-Key authentication with appropriate scopes.
 *
 * Base path: /api/v1/
 *
 * Endpoints:
 *  - /api/v1/workout/*    (scope: workout:read)
 *  - /api/v1/finance/*   (scope: finance:read)
 *  - /api/v1/habits/*    (scope: habits:read)   [stub, task-07]
 *  - /api/v1/dashboard/* (scope: dashboard:read)
 */
@Module({
  imports: [
    AgentsModule,
    TypeOrmModule.forFeature([
      // Workout
      WorkoutSession,
      WorkoutSet,
      WorkoutExercise,
      WorkoutCategory,
      BodyWeightEntry,
      // Dashboard
      Stream,
      Track,
      // Finance
      FinanceTransaction,
      FinanceWallet,
      FinanceCategory,
      FinanceSubscription,
    ]),
  ],
  providers: [
    WorkoutSessionsService,
    WorkoutExercisesService,
    BodyWeightService,
    DashboardService,
    TransactionsService,
    WalletsService,
    CategoriesService,
    SubscriptionsService,
  ],
  controllers: [
    AgentWorkoutController,
    AgentDashboardController,
    AgentFinanceController,
    AgentHabitsController,
  ],
})
export class ApiV1Module {}
