package com.toolhub.classdiagramgenerator.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.servlet.LocaleResolver
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import org.springframework.web.servlet.i18n.CookieLocaleResolver
import org.springframework.web.servlet.i18n.LocaleChangeInterceptor
import org.springframework.web.servlet.resource.WebJarsResourceResolver
import java.time.Duration
import java.util.Locale

@Configuration
class WebMvcConfig : WebMvcConfigurer {
    @Bean
    fun localeResolver(): LocaleResolver =
        CookieLocaleResolver("LOCALE").apply {
            setDefaultLocale(Locale.KOREAN)
            setCookieMaxAge(Duration.ofDays(LOCALE_COOKIE_DAYS))
        }

    @Bean
    fun localeChangeInterceptor() =
        LocaleChangeInterceptor().apply {
            paramName = "lang"
        }

    override fun addInterceptors(registry: InterceptorRegistry) {
        registry.addInterceptor(localeChangeInterceptor())
    }

    override fun addResourceHandlers(registry: ResourceHandlerRegistry) {
        registry
            .addResourceHandler("/webjars/**")
            .addResourceLocations("classpath:/META-INF/resources/webjars/")
            .resourceChain(true)
            .addResolver(WebJarsResourceResolver())
    }

    companion object {
        private const val LOCALE_COOKIE_DAYS = 30L
    }
}
