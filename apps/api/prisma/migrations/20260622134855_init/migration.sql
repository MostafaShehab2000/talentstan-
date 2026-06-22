-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('company', 'hospital', 'education', 'other');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'suspended', 'trial', 'expired');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('basic', 'professional', 'enterprise');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('active', 'suspended', 'terminated');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('employee', 'manager', 'hr_admin', 'super_admin');

-- CreateEnum
CREATE TYPE "WorkflowModule" AS ENUM ('leave', 'permission', 'mission', 'appraisal', 'recruitment', 'helpdesk');

-- CreateEnum
CREATE TYPE "ApproverType" AS ENUM ('direct_manager', 'department_head', 'specific_role', 'specific_user');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('in_review', 'approved', 'rejected', 'returned', 'cancelled');

-- CreateEnum
CREATE TYPE "WorkflowAction" AS ENUM ('approve', 'reject', 'return', 'delegate');

-- CreateEnum
CREATE TYPE "LeaveCategory" AS ENUM ('leave', 'permission', 'mission');

-- CreateEnum
CREATE TYPE "AccrualType" AS ENUM ('fixed_annual', 'monthly_accrual', 'by_seniority');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('draft', 'submitted', 'in_review', 'approved', 'rejected', 'returned', 'cancelled');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('permanent', 'temporary', 'internship', 'replacement');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('normal', 'announcement');

-- CreateEnum
CREATE TYPE "TargetScope" AS ENUM ('company', 'department', 'custom');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('mcq', 'rating', 'likert', 'text', 'yes_no');

-- CreateEnum
CREATE TYPE "CycleType" AS ENUM ('semi_annual', 'annual');

-- CreateEnum
CREATE TYPE "SectionType" AS ENUM ('kpi', 'competency', 'discipline');

-- CreateEnum
CREATE TYPE "EvaluatorType" AS ENUM ('self', 'manager', 'peer');

-- CreateEnum
CREATE TYPE "AppraisalStatus" AS ENUM ('not_started', 'in_progress', 'completed', 'approved');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'pending_employee', 'resolved', 'closed', 'reopened');

-- CreateEnum
CREATE TYPE "ImportModule" AS ENUM ('employees', 'leave_balances', 'appraisals', 'payroll');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('pending_review', 'confirmed', 'rolled_back');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('workflow', 'announcement', 'chat', 'survey', 'appraisal', 'payslip', 'sla_reminder');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TenantType" NOT NULL DEFAULT 'company',
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "maxEmployees" INTEGER NOT NULL,
    "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'basic',
    "subscriptionStart" TIMESTAMP(3),
    "subscriptionEnd" TIMESTAMP(3),
    "status" "TenantStatus" NOT NULL DEFAULT 'trial',
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Cairo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "parentDepartmentId" TEXT,
    "name" TEXT NOT NULL,
    "headEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_titles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gradeLevel" INTEGER,

    CONSTRAINT "job_titles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_descriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "jobTitleId" TEXT NOT NULL,
    "departmentId" TEXT,
    "jobPurpose" TEXT,
    "responsibilities" JSONB,
    "qualifications" TEXT,
    "experienceRequired" TEXT,
    "skills" JSONB,
    "salaryRangeMin" DECIMAL(65,30),
    "salaryRangeMax" DECIMAL(65,30),
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT,
    "departmentId" TEXT,
    "jobTitleId" TEXT,
    "directManagerId" TEXT,
    "hireDate" TIMESTAMP(3),
    "isManager" BOOLEAN NOT NULL DEFAULT false,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'active',
    "profilePhotoUrl" TEXT,
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_roles" (
    "employeeId" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL,

    CONSTRAINT "employee_roles_pkey" PRIMARY KEY ("employeeId","role")
);

-- CreateTable
CREATE TABLE "workflow_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" "WorkflowModule" NOT NULL,
    "conditions" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "workflow_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "workflowTemplateId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "approverType" "ApproverType" NOT NULL,
    "approverReference" TEXT,
    "slaHours" INTEGER,
    "escalationApproverType" "ApproverType",

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowTemplateId" TEXT,
    "relatedEntityType" TEXT NOT NULL,
    "relatedEntityId" TEXT NOT NULL,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'in_review',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_actions_log" (
    "id" TEXT NOT NULL,
    "workflowInstanceId" TEXT NOT NULL,
    "stepOrder" INTEGER NOT NULL,
    "actorEmployeeId" TEXT,
    "action" "WorkflowAction" NOT NULL,
    "comment" TEXT,
    "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_actions_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_types" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "LeaveCategory" NOT NULL,
    "isBalanceBased" BOOLEAN NOT NULL DEFAULT true,
    "accrualType" "AccrualType",
    "annualQuota" DECIMAL(65,30),
    "carryOverCap" DECIMAL(65,30),
    "requiresAttachment" BOOLEAN NOT NULL DEFAULT false,
    "workflowTemplateId" TEXT,
    "minDays" DECIMAL(65,30),
    "maxDays" DECIMAL(65,30),
    "advanceNoticeDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_leave_balances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "entitled" DECIMAL(65,30) NOT NULL,
    "used" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "employee_leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "leaveTypeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "startTime" TEXT,
    "endTime" TEXT,
    "totalDays" DECIMAL(65,30),
    "totalHours" DECIMAL(65,30),
    "reason" TEXT,
    "attachmentUrl" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'submitted',
    "workflowInstanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_requests" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "jobTitleId" TEXT,
    "newJobTitleName" TEXT,
    "jobDescriptionId" TEXT,
    "vacanciesCount" INTEGER NOT NULL DEFAULT 1,
    "employmentType" "EmploymentType",
    "reason" TEXT,
    "proposedSalaryMin" DECIMAL(65,30),
    "proposedSalaryMax" DECIMAL(65,30),
    "targetStartDate" TIMESTAMP(3),
    "attachmentUrl" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'submitted',
    "workflowInstanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruitment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT,
    "mediaUrls" JSONB,
    "postType" "PostType" NOT NULL DEFAULT 'normal',
    "targetScope" "TargetScope" NOT NULL DEFAULT 'company',
    "targetDepartmentIds" TEXT[],
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "publishAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_reactions" (
    "postId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "reactionType" TEXT NOT NULL,

    CONSTRAINT "post_reactions_pkey" PRIMARY KEY ("postId","employeeId")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "post_views" (
    "postId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_views_pkey" PRIMARY KEY ("postId","employeeId")
);

-- CreateTable
CREATE TABLE "chat_groups" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "isDepartmentGroup" BOOLEAN NOT NULL DEFAULT false,
    "departmentId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_group_members" (
    "chatGroupId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "chat_group_members_pkey" PRIMARY KEY ("chatGroupId","employeeId")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "chatGroupId" TEXT,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT,
    "messageText" TEXT,
    "attachmentUrl" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "targetScope" "TargetScope" NOT NULL DEFAULT 'company',
    "targetDepartmentIds" TEXT[],
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "sectionName" TEXT,
    "questionText" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "options" JSONB,
    "displayOrder" INTEGER NOT NULL,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerValue" TEXT,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_participation" (
    "surveyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "survey_participation_pkey" PRIMARY KEY ("surveyId","employeeId")
);

-- CreateTable
CREATE TABLE "appraisal_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cycleType" "CycleType" NOT NULL,
    "jobTitleId" TEXT,
    "enableSelfAppraisal" BOOLEAN NOT NULL DEFAULT true,
    "enableManagerAppraisal" BOOLEAN NOT NULL DEFAULT true,
    "enable360" BOOLEAN NOT NULL DEFAULT false,
    "workflowTemplateId" TEXT,

    CONSTRAINT "appraisal_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisal_sections" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sectionType" "SectionType" NOT NULL,
    "weight" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "appraisal_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisal_criteria" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "criterionName" TEXT NOT NULL,
    "weight" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "appraisal_criteria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisal_cycles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "AppraisalStatus" NOT NULL DEFAULT 'not_started',

    CONSTRAINT "appraisal_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_appraisals" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "managerId" TEXT,
    "selfScore" DECIMAL(65,30),
    "managerScore" DECIMAL(65,30),
    "finalScore" DECIMAL(65,30),
    "status" "AppraisalStatus" NOT NULL DEFAULT 'not_started',
    "workflowInstanceId" TEXT,

    CONSTRAINT "employee_appraisals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appraisal_criteria_scores" (
    "id" TEXT NOT NULL,
    "employeeAppraisalId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "evaluatorType" "EvaluatorType" NOT NULL,
    "score" DECIMAL(65,30) NOT NULL,
    "comment" TEXT,

    CONSTRAINT "appraisal_criteria_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basicSalary" DECIMAL(65,30) NOT NULL,
    "allowances" JSONB,
    "deductions" JSONB,
    "netSalary" DECIMAL(65,30) NOT NULL,
    "pdfUrl" TEXT,
    "uploadedById" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_access_log" (
    "id" TEXT NOT NULL,
    "payslipId" TEXT NOT NULL,
    "viewedById" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payslip_access_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentCategoryId" TEXT,
    "assignedGroup" TEXT,
    "defaultPriority" "TicketPriority" NOT NULL DEFAULT 'medium',
    "slaFirstResponseHrs" INTEGER,
    "slaResolutionHrs" INTEGER,
    "workflowTemplateId" TEXT,
    "customFieldsSchema" JSONB,

    CONSTRAINT "helpdesk_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "customFieldsValues" JSONB,
    "priority" "TicketPriority" NOT NULL DEFAULT 'medium',
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "assignedToId" TEXT,
    "workflowInstanceId" TEXT,
    "satisfactionRating" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "helpdesk_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "helpdesk_ticket_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT,
    "attachmentUrl" TEXT,
    "isInternalNote" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "helpdesk_ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" "ImportModule" NOT NULL,
    "fileName" TEXT,
    "uploadedById" TEXT NOT NULL,
    "totalRows" INTEGER,
    "successRows" INTEGER,
    "failedRows" INTEGER,
    "status" "ImportStatus" NOT NULL DEFAULT 'pending_review',
    "errorReport" JSONB,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batch_records" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "affectedTable" TEXT NOT NULL,
    "affectedRecordId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,

    CONSTRAINT "import_batch_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_schedules" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "recipientEmails" JSONB,
    "filters" JSONB,
    "createdById" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "export_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenantId_employeeCode_key" ON "employees"("tenantId", "employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX "employee_leave_balances_employeeId_leaveTypeId_year_key" ON "employee_leave_balances"("employeeId", "leaveTypeId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "appraisal_criteria_scores_employeeAppraisalId_criterionId_e_key" ON "appraisal_criteria_scores"("employeeAppraisalId", "criterionId", "evaluatorType");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_employeeId_month_year_key" ON "payslips"("employeeId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "helpdesk_tickets_ticketNumber_key" ON "helpdesk_tickets"("ticketNumber");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parentDepartmentId_fkey" FOREIGN KEY ("parentDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_headEmployeeId_fkey" FOREIGN KEY ("headEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_titles" ADD CONSTRAINT "job_titles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "job_titles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_directManagerId_fkey" FOREIGN KEY ("directManagerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_roles" ADD CONSTRAINT "employee_roles_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_templates" ADD CONSTRAINT "workflow_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "workflow_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "workflow_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_actions_log" ADD CONSTRAINT "workflow_actions_log_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_actions_log" ADD CONSTRAINT "workflow_actions_log_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_types" ADD CONSTRAINT "leave_types_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "workflow_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_leave_balances" ADD CONSTRAINT "employee_leave_balances_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_requests" ADD CONSTRAINT "recruitment_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_requests" ADD CONSTRAINT "recruitment_requests_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_requests" ADD CONSTRAINT "recruitment_requests_jobDescriptionId_fkey" FOREIGN KEY ("jobDescriptionId") REFERENCES "job_descriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recruitment_requests" ADD CONSTRAINT "recruitment_requests_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_views" ADD CONSTRAINT "post_views_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_groups" ADD CONSTRAINT "chat_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_group_members" ADD CONSTRAINT "chat_group_members_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatGroupId_fkey" FOREIGN KEY ("chatGroupId") REFERENCES "chat_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "survey_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_participation" ADD CONSTRAINT "survey_participation_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_participation" ADD CONSTRAINT "survey_participation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_templates" ADD CONSTRAINT "appraisal_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_templates" ADD CONSTRAINT "appraisal_templates_jobTitleId_fkey" FOREIGN KEY ("jobTitleId") REFERENCES "job_titles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_templates" ADD CONSTRAINT "appraisal_templates_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "workflow_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_sections" ADD CONSTRAINT "appraisal_sections_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "appraisal_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_criteria" ADD CONSTRAINT "appraisal_criteria_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "appraisal_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_cycles" ADD CONSTRAINT "appraisal_cycles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_appraisals" ADD CONSTRAINT "employee_appraisals_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "appraisal_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_appraisals" ADD CONSTRAINT "employee_appraisals_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_appraisals" ADD CONSTRAINT "employee_appraisals_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "appraisal_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_appraisals" ADD CONSTRAINT "employee_appraisals_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_appraisals" ADD CONSTRAINT "employee_appraisals_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_criteria_scores" ADD CONSTRAINT "appraisal_criteria_scores_employeeAppraisalId_fkey" FOREIGN KEY ("employeeAppraisalId") REFERENCES "employee_appraisals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appraisal_criteria_scores" ADD CONSTRAINT "appraisal_criteria_scores_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "appraisal_criteria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_access_log" ADD CONSTRAINT "payslip_access_log_payslipId_fkey" FOREIGN KEY ("payslipId") REFERENCES "payslips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_access_log" ADD CONSTRAINT "payslip_access_log_viewedById_fkey" FOREIGN KEY ("viewedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_categories" ADD CONSTRAINT "helpdesk_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_categories" ADD CONSTRAINT "helpdesk_categories_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "helpdesk_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_categories" ADD CONSTRAINT "helpdesk_categories_workflowTemplateId_fkey" FOREIGN KEY ("workflowTemplateId") REFERENCES "workflow_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "helpdesk_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_tickets" ADD CONSTRAINT "helpdesk_tickets_workflowInstanceId_fkey" FOREIGN KEY ("workflowInstanceId") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_messages" ADD CONSTRAINT "helpdesk_ticket_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "helpdesk_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "helpdesk_ticket_messages" ADD CONSTRAINT "helpdesk_ticket_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batch_records" ADD CONSTRAINT "import_batch_records_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_schedules" ADD CONSTRAINT "export_schedules_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
