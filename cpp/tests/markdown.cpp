#include <sstream>

#include <boost/test/unit_test.hpp>
#include <boost/filesystem.hpp>

#include <stencila/markdown.hpp>
#include <stencila/xml.hpp>

BOOST_AUTO_TEST_SUITE(markdown_quick)

using namespace Stencila;
using Stencila::Markdown::Document;

BOOST_AUTO_TEST_CASE(dump) {
  Document doc("foo");

  BOOST_CHECK_EQUAL(doc.md(), "foo\n");
  BOOST_CHECK_EQUAL(doc.html(), "<p>foo</p>\n");
  BOOST_CHECK_EQUAL(doc.latex(), "foo\n");
  BOOST_CHECK_EQUAL(doc.man(), ".PP\nfoo\n");
}

BOOST_AUTO_TEST_CASE(html) {
  // Tests of how cmark does conversions to HTML
  Document doc;

  BOOST_CHECK_EQUAL(doc.md("Inline `code`.").html(), "<p>Inline <code>code</code>.</p>\n");
  BOOST_CHECK_EQUAL(doc.md("```\ncode block\n```").html(), "<pre><code>code block\n</code></pre>\n");
}

BOOST_AUTO_TEST_CASE(html_doc_set) {
  for(auto pair : std::vector<std::array<std::string,2>>{
    
    {"<blockquote>blockquote1</blockquote>", "> blockquote1\n"},

    {"<ul><li>a</li><li>b</li></ul>", "  - a\n  - b\n"},
    {"<ol><li>a</li><li>b</li></ol>", "1.  a\n2.  b\n"},

    {"<pre><code>x = 42</code></pre>", "    x = 42\n"}, // No info, so indented
    {"<pre><code class=\"r\">x = 42</code></pre>", "``` r\nx = 42\n```\n"}, // Info, so fenced

    {"<h1>Heading 1</h1>", "# Heading 1\n"},
    {"<h2>Heading 2</h2>", "## Heading 2\n"},
    {"<h3>Heading 3</h3>", "### Heading 3\n"},
    {"<h4>Heading 4</h4>", "#### Heading 4\n"},
    {"<h5>Heading 5</h5>", "##### Heading 5\n"},
    {"<h6>Heading 6</h6>", "###### Heading 6\n"},

    {"<code>code</code>.", "`code`\n"},
    {"<p>Some <code>inline code</code>.</p>", "Some `inline code`.\n"},

    {"<em>emphasised</em>", "*emphasised*\n"},
    {"<strong>strong</strong>", "**strong**\n"},

    {"<a>link</a>", "[link]()\n"},
    {"<a href=\"url\">link</a>", "[link](url)\n"},
    {"<a href=\"url\" title=\"title\">link</a>", "[link](url \"title\")\n"},

    {"<img />", "![]()\n"},
    {"<img src=\"url\" />", "![](url)\n"},
    {"<img src=\"url\" title=\"title\" />", "![](url \"title\")\n"},

    {"<div>A block HTML element</div>", "<div>A block HTML element</div>\n"},
    {"<p>An <span>inline HTML</span> element</p>", "An <span>inline HTML</span> element\n"}

  }) {
      Xml::Document html(pair[0]);
      Markdown::Document md;
      md.html_doc(html);
      BOOST_CHECK_EQUAL(md.md(),pair[1]);
  }
}

BOOST_AUTO_TEST_CASE(read_write) {
  using namespace boost::filesystem;

  Document doc;

  auto path = (temp_directory_path() / unique_path()).string();
  std::ofstream file(path);
  file << "foo\n";
  file.close();

  doc.read(path);

  auto read_ = [](const std::string& path){
    std::ifstream file(path);
    std::stringstream buffer;
    buffer << file.rdbuf();
    return buffer.str();
  };

  doc.write(path+".md");
  BOOST_CHECK_EQUAL(read_(path+".md"), "foo\n");

  doc.write(path+".html");
  BOOST_CHECK_EQUAL(read_(path+".html"), "<p>foo</p>\n");

  doc.write(path+".groff");
  BOOST_CHECK_EQUAL(read_(path+".groff"), ".PP\nfoo\n");
}

BOOST_AUTO_TEST_SUITE_END()
