package com.planningpoker.architecture;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

/**
 * Enforces Evans' layered architecture: the domain is the heart and depends on nothing but itself and the
 * shared kernel; the application layer orchestrates the domain; interfaces and infrastructure sit outside.
 * The build fails if anyone breaks these rules.
 */
@AnalyzeClasses(packages = "com.planningpoker", importOptions = ImportOption.DoNotIncludeTests.class)
class DddArchitectureTest {

    @ArchTest
    static final ArchRule layers = layeredArchitecture().consideringOnlyDependenciesInLayers()
            .layer("Interfaces").definedBy("..estimation.interfaces..")
            .layer("Application").definedBy("..estimation.application..")
            .layer("Domain").definedBy("..estimation.domain..", "..sharedkernel.domain..")
            .layer("Infrastructure").definedBy("..estimation.infrastructure..")
            .layer("Bootstrap").definedBy("com.planningpoker", "com.planningpoker.config..")
            .whereLayer("Interfaces").mayOnlyBeAccessedByLayers("Bootstrap")
            .whereLayer("Infrastructure").mayOnlyBeAccessedByLayers("Bootstrap")
            .whereLayer("Application").mayOnlyBeAccessedByLayers("Interfaces", "Infrastructure", "Bootstrap")
            .whereLayer("Domain").mayOnlyBeAccessedByLayers("Application", "Interfaces", "Infrastructure", "Bootstrap");

    @ArchTest
    static final ArchRule domainIsPureJava = classes().that().resideInAnyPackage("..domain..")
            .should().onlyDependOnClassesThat().resideInAnyPackage("..domain..", "java..")
            .because("the domain model must not know about frameworks, databases or the web");

    @ArchTest
    static final ArchRule applicationIsFrameworkFree = noClasses().that().resideInAPackage("..application..")
            .should().dependOnClassesThat().resideInAnyPackage("org.springframework..", "jakarta..", "java.sql..")
            .because("use cases are plain Java; frameworks are plugged in through ports");

    @ArchTest
    static final ArchRule domainDoesNotSeeUpperLayers = noClasses().that().resideInAPackage("..domain..")
            .should().dependOnClassesThat().resideInAnyPackage("..application..", "..infrastructure..", "..interfaces..");

    @ArchTest
    static final ArchRule repositoriesAreDomainInterfaces = classes().that().haveSimpleNameEndingWith("Repository")
            .and().resideInAPackage("..domain..")
            .should().beInterfaces();

    @ArchTest
    static final ArchRule interfacesDoNotTouchInfrastructure = noClasses().that().resideInAPackage("..interfaces..")
            .should().dependOnClassesThat().resideInAPackage("..infrastructure..");
}
