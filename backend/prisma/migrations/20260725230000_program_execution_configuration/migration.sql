ALTER TABLE "program_versions"
    ADD COLUMN "execution_configuration" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "program_versions"
    ADD CONSTRAINT "program_versions_execution_configuration_check"
    CHECK (jsonb_typeof("execution_configuration") = 'object');
