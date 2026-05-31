import org.gradle.api.plugins.JavaPluginExtension

subprojects {
    apply(plugin = "java")

    group = "com.example"
    version = "1.0.0"

    repositories {
        mavenCentral()
    }

    extensions.configure<JavaPluginExtension> {
        toolchain {
            languageVersion = JavaLanguageVersion.of(17)
        }
    }
}
