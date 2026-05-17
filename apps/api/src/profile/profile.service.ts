import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  Profile,
  ProfileAnswer,
  ProfileAnswerCategory,
  RelationshipPreference,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { calculateCompletion } from './completion.util';
import type { UpdateProfileDto } from './dto/update-profile.dto';

export interface MyProfileResult {
  user: {
    region1: string;
    region2: string | null;
    targetGender: string;
    gender: string;
    birthYear: number;
  };
  profile: {
    jobCategory: string | null;
    intro: string | null;
    lifestyleTags: string[];
  } | null;
  answers: Array<{ category: ProfileAnswerCategory; questionKey: string; answer: string }>;
  preference: {
    intent: string;
    pace: string;
    contactFrequency: string;
    extra: unknown;
  } | null;
  completion: number;
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string): Promise<MyProfileResult> {
    const [user, profile, answers, preference] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      this.prisma.profile.findUnique({ where: { userId } }),
      this.prisma.profileAnswer.findMany({ where: { userId } }),
      this.prisma.relationshipPreference.findUnique({ where: { userId } }),
    ]);

    return this.buildResult(user, profile, answers, preference);
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto): Promise<MyProfileResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. User 필드 갱신
      if (dto.region1 !== undefined || dto.region2 !== undefined || dto.targetGender !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(dto.region1 !== undefined ? { region1: dto.region1 } : {}),
            ...(dto.region2 !== undefined ? { region2: dto.region2 } : {}),
            ...(dto.targetGender !== undefined ? { targetGender: dto.targetGender } : {}),
          },
        });
      }

      // 2. Profile 필드 갱신 (upsert)
      if (
        dto.jobCategory !== undefined ||
        dto.intro !== undefined ||
        dto.lifestyleTags !== undefined
      ) {
        await tx.profile.upsert({
          where: { userId },
          create: {
            userId,
            jobCategory: dto.jobCategory ?? null,
            intro: dto.intro ?? null,
            lifestyleTags: dto.lifestyleTags ?? [],
          },
          update: {
            ...(dto.jobCategory !== undefined ? { jobCategory: dto.jobCategory } : {}),
            ...(dto.intro !== undefined ? { intro: dto.intro } : {}),
            ...(dto.lifestyleTags !== undefined ? { lifestyleTags: dto.lifestyleTags } : {}),
          },
        });
      }

      // 3. 문답 upsert
      if (dto.answers?.length) {
        for (const a of dto.answers) {
          await tx.profileAnswer.upsert({
            where: { userId_questionKey: { userId, questionKey: a.questionKey } },
            create: {
              userId,
              category: a.category,
              questionKey: a.questionKey,
              answer: a.answer,
            },
            update: { category: a.category, answer: a.answer },
          });
        }
      }

      // 4. 관계 선호 upsert
      if (dto.preference) {
        const extra =
          dto.preference.extra !== undefined
            ? (dto.preference.extra as Prisma.InputJsonValue)
            : undefined;
        await tx.relationshipPreference.upsert({
          where: { userId },
          create: {
            userId,
            intent: dto.preference.intent,
            pace: dto.preference.pace,
            contactFrequency: dto.preference.contactFrequency,
            extra,
          },
          update: {
            intent: dto.preference.intent,
            pace: dto.preference.pace,
            contactFrequency: dto.preference.contactFrequency,
            extra,
          },
        });
      }

      // 5. 갱신된 상태 조회 + completion 계산 + Profile.completionScore 저장
      const [user, profile, answers, preference] = await Promise.all([
        tx.user.findUniqueOrThrow({ where: { id: userId } }),
        tx.profile.findUnique({ where: { userId } }),
        tx.profileAnswer.findMany({ where: { userId } }),
        tx.relationshipPreference.findUnique({ where: { userId } }),
      ]);

      const completion = calculateCompletion({
        region1: user.region1,
        targetGender: user.targetGender,
        jobCategory: profile?.jobCategory,
        intro: profile?.intro,
        lifestyleTags: profile?.lifestyleTags,
        answerCounts: {
          story: answers.filter((a) => a.category === 'story').length,
          relationship: answers.filter((a) => a.category === 'relationship').length,
        },
        hasPreference: preference !== null,
      });

      if (profile) {
        await tx.profile.update({
          where: { userId },
          data: { completionScore: completion },
        });
      }

      return { user, profile, answers, preference, completion };
    });

    this.logger.log(`profile updated: user=${userId} completion=${result.completion}`);
    return this.buildResult(
      result.user,
      result.profile,
      result.answers,
      result.preference,
      result.completion,
    );
  }

  private buildResult(
    user: User,
    profile: Profile | null,
    answers: ProfileAnswer[],
    preference: RelationshipPreference | null,
    cachedCompletion?: number,
  ): MyProfileResult {
    const completion =
      cachedCompletion ??
      calculateCompletion({
        region1: user.region1,
        targetGender: user.targetGender,
        jobCategory: profile?.jobCategory,
        intro: profile?.intro,
        lifestyleTags: profile?.lifestyleTags,
        answerCounts: {
          story: answers.filter((a) => a.category === 'story').length,
          relationship: answers.filter((a) => a.category === 'relationship').length,
        },
        hasPreference: preference !== null,
      });

    return {
      user: {
        region1: user.region1,
        region2: user.region2,
        targetGender: user.targetGender,
        gender: user.gender,
        birthYear: user.birthYear,
      },
      profile: profile
        ? {
            jobCategory: profile.jobCategory,
            intro: profile.intro,
            lifestyleTags: profile.lifestyleTags,
          }
        : null,
      answers: answers.map((a) => ({
        category: a.category,
        questionKey: a.questionKey,
        answer: a.answer,
      })),
      preference: preference
        ? {
            intent: preference.intent,
            pace: preference.pace,
            contactFrequency: preference.contactFrequency,
            extra: preference.extra,
          }
        : null,
      completion,
    };
  }
}
