import { ApiProperty } from "@nestjs/swagger";

export class FitNotesPreviewCounts {
  @ApiProperty()
  total: number;

  @ApiProperty()
  new: number;

  @ApiProperty()
  existing: number;
}

export class FitNotesFileInfo {
  @ApiProperty()
  name: string;

  @ApiProperty()
  size: number;

  @ApiProperty()
  valid: boolean;
}

export class FitNotesDateRange {
  @ApiProperty({ nullable: true })
  earliest: string | null;

  @ApiProperty({ nullable: true })
  latest: string | null;
}

export class FitNotesTopExercise {
  @ApiProperty()
  name: string;

  @ApiProperty()
  count: number;
}

export class FitNotesPreviewResponse {
  @ApiProperty()
  previewId: string;

  @ApiProperty({ type: FitNotesFileInfo })
  file: FitNotesFileInfo;

  @ApiProperty()
  counts: {
    categories: FitNotesPreviewCounts;
    exercises: FitNotesPreviewCounts;
    sessions: FitNotesPreviewCounts;
    sets: FitNotesPreviewCounts;
    bodyweight: FitNotesPreviewCounts;
  };

  @ApiProperty({ type: FitNotesDateRange })
  dateRange: FitNotesDateRange;

  @ApiProperty({ type: [FitNotesTopExercise] })
  topExercises: FitNotesTopExercise[];

  @ApiProperty({ type: [String] })
  warnings: string[];
}

export class FitNotesProgressEvent {
  @ApiProperty({
    enum: [
      "starting",
      "categories",
      "exercises",
      "sessions",
      "bodyweight",
      "complete",
      "error",
    ],
  })
  stage:
    | "starting"
    | "categories"
    | "exercises"
    | "sessions"
    | "bodyweight"
    | "complete"
    | "error";

  @ApiProperty({ description: "Progress percentage 0-100" })
  progress: number;

  @ApiProperty()
  current: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  message: string;

  @ApiProperty({ required: false })
  error?: string;
}

export interface FitNotesPreviewData {
  filePath: string;
  accountId: string;
  preview: FitNotesPreviewResponse;
  createdAt: number;
}
